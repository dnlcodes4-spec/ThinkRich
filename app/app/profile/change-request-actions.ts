"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { isChangeField, fieldLabel } from "@/app/app/members/change-request-fields";

// A member requests a correction to one of their details. It is stored pending;
// a state-level admin reviews it (see detail-actions.ts). Members can't update
// their own row under RLS, so the insert uses the service role, authorized by the
// row being the caller's own.
export type ChangeReqState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitChangeRequest(_prev: ChangeReqState, formData: FormData): Promise<ChangeReqState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const { data: member } = await supabase
    .from("members")
    .select("id, status, full_name, state_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { status: "error", message: "This is for members only." };
  if (member.status !== "active") return { status: "error", message: "Your membership is not active." };

  const field = String(formData.get("field") ?? "");
  const newValue = String(formData.get("new_value") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!isChangeField(field)) return { status: "error", message: "Pick a field.", fieldErrors: { field: "Required." } };
  if (!newValue) return { status: "error", message: "Enter the new value.", fieldErrors: { new_value: "Required." } };
  if (field === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newValue)) {
    return { status: "error", message: "Enter a valid email.", fieldErrors: { new_value: "Invalid email." } };
  }
  if (field === "date_of_birth" && Number.isNaN(Date.parse(newValue))) {
    return { status: "error", message: "Enter a valid date.", fieldErrors: { new_value: "Invalid date." } };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("change_requests").insert({
    member_id: member.id,
    field,
    new_value: newValue,
    reason,
  });
  if (error) {
    if (error.code === "23505") {
      return { status: "error", message: "You already have a pending request for that field." };
    }
    return { status: "error", message: "Could not submit your request. Please try again." };
  }

  // Notify the state admin(s) for this member's state so they can review.
  const { data: reviewers } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "state_admin")
    .eq("state_id", member.state_id);
  const reviewerIds = (reviewers ?? []).map((r) => r.id);
  if (reviewerIds.length > 0) {
    await notify(reviewerIds, {
      type: "change_request",
      title: `${member.full_name} requested a ${fieldLabel(field)} correction`,
      body: "Review it on their member page.",
      link: `/app/members/${member.id}`,
      createdBy: user.id,
    });
  }

  revalidatePath("/app/profile");
  return { status: "success", message: "Request submitted. A coordinator will review it." };
}
