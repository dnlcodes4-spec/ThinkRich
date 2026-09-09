"use server";

import { zodFail } from "@/lib/action-state";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { partnershipRequestSchema } from "@/lib/partners";

export type PartnershipState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const THANKS =
  "Thank you. Your partnership request has been received, and we'll be in touch shortly.";

// The public "become a partner" form on the Think-Winners landing. Anonymous, so
// it never touches the DB directly: after validation it writes via the service
// role into `partnership_requests` (super-admin-only to read) and notifies the
// super admins. A hidden honeypot field and a per-email dedupe are the only spam
// controls until real rate limiting lands (Phase 4).
export async function requestPartnership(
  _prev: PartnershipState,
  formData: FormData,
): Promise<PartnershipState> {
  // Bots fill hidden fields; humans never see this one. Acknowledge and drop.
  if ((formData.get("company") as string | null)?.trim()) {
    return { status: "success", message: THANKS };
  }

  const opt = (k: string) => (formData.get(k) as string | null)?.trim() || undefined;
  const parsed = partnershipRequestSchema.safeParse({
    name: formData.get("name"),
    organization: formData.get("organization"),
    role: opt("role"),
    email: formData.get("email"),
    phone: opt("phone"),
    message: formData.get("message"),
  });
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;

  const admin = tryCreateAdminClient();
  // If the service role is not configured, still acknowledge: losing a lead is
  // better than showing a stranger an error, and the form has no other job.
  if (!admin) return { status: "success", message: THANKS };

  // Skip a duplicate while an earlier request from this address is still open.
  const { data: open } = await admin
    .from("partnership_requests")
    .select("id")
    .eq("email", d.email)
    .eq("status", "new")
    .maybeSingle();
  if (open) return { status: "success", message: THANKS };

  const { data: inserted } = await admin
    .from("partnership_requests")
    .insert({
      name: d.name,
      organization: d.organization,
      role_title: d.role || null,
      email: d.email,
      phone: d.phone || null,
      message: d.message,
    })
    .select("id")
    .single();

  if (inserted) {
    const { data: supers } = await admin.from("profiles").select("id").eq("role", "super_admin");
    const ids = (supers ?? []).map((s) => s.id);
    if (ids.length > 0) {
      try {
        await notify(ids, {
          type: "partnership.request",
          title: "New partnership request",
          body: `${d.organization} — ${d.name}`,
          link: "/app/admin/partners/requests",
        });
      } catch {
        /* the request is saved; a failed notification must not fail the form */
      }
    }
  }

  return { status: "success", message: THANKS };
}
