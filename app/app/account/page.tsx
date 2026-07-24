import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/terms";
import { ChangePasswordForm } from "./change-password";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

// Every signed-in user's own account: who they are, where they sit, and a
// password change. Members get a link on to their membership details; the
// coordinator tiers have no member record, which is why they need this page.
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, role, state_id, lga_id, ward_id, polling_unit_id")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const [st, lg, wd, pu] = await Promise.all([
    profile?.state_id
      ? supabase.from("states").select("name").eq("id", profile.state_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile?.lga_id
      ? supabase.from("lgas").select("name").eq("id", profile.lga_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile?.ward_id
      ? supabase.from("wards").select("name").eq("id", profile.ward_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile?.polling_unit_id
      ? supabase.from("polling_units").select("name").eq("id", profile.polling_unit_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const area = [st.data?.name, lg.data?.name, wd.data?.name, pu.data?.name]
    .filter(Boolean)
    .join(" › ");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Your account
      </h1>
      <p className="mt-1 text-sm text-muted">Who you are signed in as, and your password.</p>

      <div className="mt-6 rounded-card border border-border bg-surface p-5">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Name</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {profile?.full_name || "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Role</dt>
            <dd className="mt-0.5 font-medium text-foreground">{roleLabel(profile?.role)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted">Email</dt>
            <dd className="mt-0.5 font-medium break-all text-foreground">
              {user?.email ?? "Not set"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted">Your area</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {area || "Nationwide"}
            </dd>
          </div>
        </dl>

        {profile?.role === "member" ? (
          <Link
            href="/app/profile"
            className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            View my membership details
          </Link>
        ) : null}
      </div>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
          Change password
        </h2>
        <p className="mt-1 text-sm text-muted">
          Choose a new password. You stay signed in on this device.
        </p>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
