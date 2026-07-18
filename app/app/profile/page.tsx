import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusPill, type MemberStatus } from "@/components/ui/status-pill";
import { PhotoUpload } from "./photo-upload";
import { MembershipStatusPanel } from "./opt-out";
import { ChangeRequestForm } from "./change-request";
import { fieldLabel } from "@/app/app/members/change-request-fields";

export const metadata: Metadata = {
  title: "My details",
  robots: { index: false, follow: false },
};

// Plain-language labels for a member's own correction requests.
const CORRECTION_STATUS: Record<string, string> = {
  pending: "Waiting for review",
  approved: "Applied",
  rejected: "Declined",
};

// A member's own profile: their details (read-only) + passport photo upload.
// The member row is read under RLS (members_select self-read by user_id); geography
// names are world-readable; the photo is a short-lived signed URL from the private
// bucket. Editing details beyond the photo is deferred (change-request flow, T-006).
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = user
    ? await supabase
        .from("members")
        .select(
          "id, membership_number, full_name, date_of_birth, email, status, passport_photo_url, state_id, lga_id, ward_id, polling_unit_id",
        )
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  if (!member) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">My details</h1>
        <p className="text-sm text-muted">This area is for members.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const [st, lg, wd, pu] = await Promise.all([
    supabase.from("states").select("name").eq("id", member.state_id).maybeSingle(),
    supabase.from("lgas").select("name").eq("id", member.lga_id).maybeSingle(),
    supabase.from("wards").select("name").eq("id", member.ward_id).maybeSingle(),
    supabase.from("polling_units").select("name").eq("id", member.polling_unit_id).maybeSingle(),
  ]);
  const geography = [st.data?.name, lg.data?.name, wd.data?.name, pu.data?.name].filter(Boolean).join(" › ");

  let photoUrl: string | null = null;
  if (member.passport_photo_url) {
    const admin = createAdminClient();
    const { data } = await admin.storage.from("member-photos").createSignedUrl(member.passport_photo_url, 600);
    photoUrl = data?.signedUrl ?? null;
  }

  let retentionUntil: string | null = null;
  if (member.status === "frozen") {
    const { data: req } = await supabase
      .from("opt_out_requests")
      .select("retention_until")
      .eq("member_id", member.id)
      .eq("status", "frozen")
      .maybeSingle();
    retentionUntil = req?.retention_until ?? null;
  }

  const { data: changeRequests } = await supabase
    .from("change_requests")
    .select("id, field, new_value, status, created_at")
    .eq("member_id", member.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const dob = member.date_of_birth
    ? new Date(member.date_of_birth).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })
    : "Not provided";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {member.full_name}
          </h1>
          <p className="mt-1 font-mono text-sm text-muted">{member.membership_number}</p>
        </div>
        <StatusPill status={member.status as MemberStatus} />
      </div>

      <div className="mt-10 grid gap-10 sm:grid-cols-[10rem_1fr]">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Passport photo</h2>
          <PhotoUpload currentUrl={photoUrl} />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Details</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Date of birth</dt>
              <dd className="mt-0.5 font-medium text-foreground">{dob}</dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="mt-0.5 font-medium break-all text-foreground">{member.email ?? "Not provided"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Your area</dt>
              <dd className="mt-0.5 font-medium text-foreground">{geography || "Not set"}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <ChangeRequestForm />
          </div>
          {changeRequests && changeRequests.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-2">
              {changeRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-3 py-2 text-xs">
                  <span className="text-muted">
                    <span className="font-medium text-foreground">{fieldLabel(r.field)}</span> to {r.new_value}
                  </span>
                  <span className="font-semibold text-muted">{CORRECTION_STATUS[r.status] ?? r.status}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="mt-12 border-t border-border pt-8">
        <MembershipStatusPanel status={member.status} retentionUntil={retentionUntil} />
      </div>
    </main>
  );
}
