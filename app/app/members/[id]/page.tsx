import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusPill, type MemberStatus } from "@/components/ui/status-pill";
import { fieldLabel } from "../change-request-fields";
import { reviewChangeRequest } from "../detail-actions";
import { LeaderPhotoUpload } from "./leader-photo";

export const metadata: Metadata = {
  title: "Member",
  robots: { index: false, follow: false },
};

// Leader/admin view of one member (scoped by RLS). Hosts leader-side photo upload
// and the member's change-request review. A member has no business here.
export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (!me || me.role === "member") notFound();

  // RLS scopes this: only an in-scope member is returned.
  const { data: member } = await supabase
    .from("members")
    .select("id, membership_number, full_name, date_of_birth, email, vin, status, passport_photo_url, state_id, lga_id, ward_id, polling_unit_id")
    .eq("id", id)
    .maybeSingle();
  if (!member) notFound();

  const [st, lg, wd, pu, reqs] = await Promise.all([
    supabase.from("states").select("name").eq("id", member.state_id).maybeSingle(),
    supabase.from("lgas").select("name").eq("id", member.lga_id).maybeSingle(),
    supabase.from("wards").select("name").eq("id", member.ward_id).maybeSingle(),
    supabase.from("polling_units").select("name").eq("id", member.polling_unit_id).maybeSingle(),
    supabase
      .from("change_requests")
      .select("id, field, new_value, reason, status, created_at")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false }),
  ]);
  const geography = [st.data?.name, lg.data?.name, wd.data?.name, pu.data?.name].filter(Boolean).join(" › ");

  let photoUrl: string | null = null;
  if (member.passport_photo_url) {
    const admin = createAdminClient();
    const { data } = await admin.storage.from("member-photos").createSignedUrl(member.passport_photo_url, 600);
    photoUrl = data?.signedUrl ?? null;
  }

  const canReview = me.role === "national_admin" || me.role === "state_admin";
  const requests = reqs.data ?? [];
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link href="/app/members" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
        ← All members
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{member.full_name}</h1>
          <p className="mt-1 font-mono text-sm text-muted">{member.membership_number}</p>
        </div>
        <StatusPill status={member.status as MemberStatus} />
      </div>

      <div className="mt-10 grid gap-10 sm:grid-cols-[10rem_1fr]">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Passport photo</h2>
          <LeaderPhotoUpload memberId={member.id} currentUrl={photoUrl} />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Details</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <Fact label="Date of birth" value={member.date_of_birth ? fmtDate(member.date_of_birth) : "—"} />
            <Fact label="Email" value={member.email ?? "—"} />
            <Fact label="Voter's ID (VIN)" value={member.vin ?? "—"} />
            <div className="sm:col-span-2">
              <Fact label="Polling unit" value={geography || "—"} />
            </div>
          </dl>
        </div>
      </div>

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-sm font-semibold text-foreground">
          Change requests <span className="text-muted">({requests.length})</span>
        </h2>
        {requests.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No change requests.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-card border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{fieldLabel(r.field)}</p>
                    <p className="mt-0.5 text-sm text-foreground">
                      New value: <span className="font-medium">{r.new_value}</span>
                    </p>
                    {r.reason ? <p className="mt-1 text-xs text-muted">Reason: {r.reason}</p> : null}
                    <p className="mt-1 text-xs text-muted">{fmtDate(r.created_at)}</p>
                  </div>
                  <RequestStatus status={r.status} />
                </div>
                {canReview && r.status === "pending" ? (
                  <div className="mt-3 flex gap-2">
                    <form action={reviewChangeRequest}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button className="min-h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover">
                        Approve &amp; apply
                      </button>
                    </form>
                    <form action={reviewChangeRequest}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <button className="min-h-9 rounded-md border border-danger/50 px-3 text-xs font-semibold text-danger hover:bg-danger-soft">
                        Reject
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium break-all text-foreground">{value}</dd>
    </div>
  );
}

function RequestStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "text-warning bg-warning-soft border-warning/30",
    approved: "text-success bg-success-soft border-success/30",
    rejected: "text-danger bg-danger-soft border-danger/30",
  };
  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${map[status] ?? ""}`}>
      {status}
    </span>
  );
}
