import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusPill, type MemberStatus } from "@/components/ui/status-pill";
import { PhotoUpload } from "./photo-upload";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
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
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Your profile</h1>
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

  const dob = member.date_of_birth
    ? new Date(member.date_of_birth).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })
    : "—";

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
              <dd className="mt-0.5 font-medium break-all text-foreground">{member.email ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Polling unit</dt>
              <dd className="mt-0.5 font-medium text-foreground">{geography || "—"}</dd>
            </div>
          </dl>
          <p className="mt-8 rounded-md bg-surface-muted p-3 text-xs text-muted">
            To correct your details, contact the leader who registered you. Editing here is coming
            with the change-request flow.
          </p>
        </div>
      </div>
    </main>
  );
}
