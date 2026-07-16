import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewAccountForm } from "./new-account-form";
import { NEXT_TIER, LEVEL_LABEL, roleLabel, type Role } from "./tiers";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

// Admin-only. An admin provisions the next tier down within their own scope.
// The Server Action re-checks authorization (the service role bypasses RLS).
export default async function NewAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = user
    ? await supabase
        .from("profiles")
        .select("role, state_id, lga_id, ward_id, polling_unit_id")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const tier = me ? NEXT_TIER[me.role as Role] : undefined;

  if (!me || !tier) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Create an account
        </h1>
        <p className="text-sm text-muted">Your role cannot create accounts.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  // In-scope options for the target tier's geography level.
  let geoOptions: { id: string; name: string }[] = [];
  if (tier.level === "state") {
    const { data } = await supabase.from("states").select("id, name").order("name");
    geoOptions = data ?? [];
  } else if (tier.level === "lga") {
    const { data } = await supabase.from("lgas").select("id, name").eq("state_id", me.state_id!).order("name");
    geoOptions = data ?? [];
  } else if (tier.level === "ward") {
    const { data } = await supabase.from("wards").select("id, name").eq("lga_id", me.lga_id!).order("name");
    geoOptions = data ?? [];
  } else if (tier.level === "polling_unit") {
    const { data } = await supabase.from("polling_units").select("id, name").eq("ward_id", me.ward_id!).order("name");
    geoOptions = data ?? [];
  }

  const geoLabel = tier.level ? LEVEL_LABEL[tier.level] : null;
  const targetLabel = roleLabel(tier.role);
  const needsGeoButEmpty = tier.level !== null && geoOptions.length === 0;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Create a <span className="capitalize">{targetLabel}</span> account
      </h1>
      <p className="mt-2 text-sm text-muted">
        You can provision the next tier below your role, within your own scope. They receive a
        temporary password to sign in with.
      </p>

      <div className="mt-8">
        {needsGeoButEmpty ? (
          <div className="rounded-card border border-dashed border-border p-8 text-center text-sm text-muted">
            No {geoLabel?.toLowerCase()}s are available in your scope yet. They arrive with the
            geography import, after which you can provision {targetLabel} accounts.
          </div>
        ) : (
          <NewAccountForm targetRoleLabel={targetLabel} geoLabel={geoLabel} geoOptions={geoOptions} />
        )}
      </div>
    </main>
  );
}
