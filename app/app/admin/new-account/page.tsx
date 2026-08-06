import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GeoPicker } from "@/components/geo-picker";
import { NewAccountForm } from "./new-account-form";
import { allowedTargets, ROLE_LEVEL, LEVEL_LABEL, roleLabel, type Role, type GeoLevel } from "./tiers";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

// Any admin may create ANY role that ranks below them (CR-0009 §3.2), which is
// what `profiles_insert` has always permitted. WHERE is still bounded by the
// caller's own scope, and the national admin has none, so they reach the whole
// country. The Server Action re-checks both rules (the service role bypasses RLS).
export default async function NewAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; state?: string; lga?: string; ward?: string; pu?: string }>;
}) {
  const sp = await searchParams;
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

  const targets = me ? allowedTargets(me.role as Role) : [];

  if (!me || targets.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Create an account</h1>
        <p className="text-sm text-muted">Your role cannot create accounts.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const unscoped = me.role === "national_admin";
  // With one option there is nothing to choose; go straight to it.
  const target = targets.find((t) => t.role === sp.role) ?? (targets.length === 1 ? targets[0] : null);
  const level = target ? ROLE_LEVEL[target.role] : null;

  const locked = {
    stateId: me.state_id ?? undefined,
    lgaId: me.lga_id ?? undefined,
    wardId: me.ward_id ?? undefined,
    pollingUnitId: me.polling_unit_id ?? undefined,
  };

  // What the picker has settled on, falling back to the caller's own scope.
  const chosen = {
    state_id: locked.stateId ?? sp.state,
    lga_id: locked.lgaId ?? sp.lga,
    ward_id: locked.wardId ?? sp.ward,
    polling_unit_id: locked.pollingUnitId ?? sp.pu,
  };
  const needed =
    level === "state" ? chosen.state_id
    : level === "lga" ? chosen.lga_id
    : level === "ward" ? chosen.ward_id
    : level === "polling_unit" ? chosen.polling_unit_id
    : null;
  const ready = level === null || Boolean(needed);

  // Is there anything for the caller to actually pick? Only if the target's level
  // sits BELOW the caller's own locked scope. A unit coordinator (locked down to a
  // polling unit) creating a leader (also a polling unit) has nothing to choose, so
  // the picker would just render a dead "Choose area" button. In that case skip it
  // and go straight to the form, showing the fixed area as text.
  const lockedAtLevel =
    level === "state" ? locked.stateId
    : level === "lga" ? locked.lgaId
    : level === "ward" ? locked.wardId
    : level === "polling_unit" ? locked.pollingUnitId
    : undefined;
  const pickerNeeded = level !== null && !lockedAtLevel;
  const fixedArea = target && level && !pickerNeeded ? await resolveArea(level, chosen) : null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Create an account</h1>
      <p className="mt-2 text-sm text-muted">
        {unscoped
          ? "You can create any role, anywhere in the country. They receive a temporary password to sign in with."
          : "You can create any role below yours, within your own area. They receive a temporary password to sign in with."}
      </p>

      {targets.length > 1 ? (
        <section className="mt-8">
          <form method="get" className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm font-semibold text-foreground">Role</span>
              <select
                name="role"
                defaultValue={target?.role ?? ""}
                className="min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base capitalize text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring"
              >
                <option value="">Select role…</option>
                {targets.map((t) => (
                  <option key={t.role} value={t.role} className="capitalize">
                    {roleLabel(t.role)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="min-h-11 shrink-0 rounded-sm border border-border bg-surface-muted px-4 text-sm font-semibold text-foreground hover:bg-border"
            >
              Continue
            </button>
          </form>
        </section>
      ) : null}

      {target && level && pickerNeeded ? (
        <section className="mt-6">
          <p className="mb-3 text-sm text-muted">
            Where will this <span className="font-semibold capitalize text-foreground">{roleLabel(target.role)}</span>{" "}
            serve? ({LEVEL_LABEL[level]})
          </p>
          <GeoPicker
            action="/app/admin/new-account"
            selection={{ stateId: sp.state, lgaId: sp.lga, wardId: sp.ward, pollingUnitId: sp.pu }}
            depth={level}
            locked={locked}
            hiddenFields={{ role: target.role }}
            submitLabel="Choose area"
            addPollingUnit={level === "polling_unit"}
          />
        </section>
      ) : target && level && fixedArea ? (
        <p className="mt-6 rounded-card border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
          This <span className="font-semibold capitalize text-foreground">{roleLabel(target.role)}</span> will serve
          in <span className="font-medium text-foreground">{fixedArea}</span>, your own area.
        </p>
      ) : null}

      {target && ready ? (
        <section className="mt-8">
          <NewAccountForm
            targetRole={target.role}
            targetRoleLabel={roleLabel(target.role)}
            scope={{
              state_id: level === "state" ? chosen.state_id : level ? chosen.state_id : undefined,
              lga_id: level === "lga" || level === "ward" || level === "polling_unit" ? chosen.lga_id : undefined,
              ward_id: level === "ward" || level === "polling_unit" ? chosen.ward_id : undefined,
              polling_unit_id: level === "polling_unit" ? chosen.polling_unit_id : undefined,
            }}
          />
        </section>
      ) : null}
    </main>
  );
}

// A readable "State › LGA › Ward › Unit" label for the fixed area, used when the
// caller's own scope already pins the target's level so no picker is shown.
async function resolveArea(
  level: Exclude<GeoLevel, null>,
  chosen: { state_id?: string; lga_id?: string; ward_id?: string; polling_unit_id?: string },
): Promise<string | null> {
  const supabase = await createClient();
  if (level === "polling_unit" && chosen.polling_unit_id) {
    const { data } = await supabase
      .from("polling_units")
      .select("name, wards(name, lgas(name, states(name)))")
      .eq("id", chosen.polling_unit_id)
      .maybeSingle();
    const w = data?.wards as { name?: string; lgas?: { name?: string; states?: { name?: string } } } | null;
    return [w?.lgas?.states?.name, w?.lgas?.name, w?.name, data?.name].filter(Boolean).join(" › ") || null;
  }
  if (level === "ward" && chosen.ward_id) {
    const { data } = await supabase
      .from("wards")
      .select("name, lgas(name, states(name))")
      .eq("id", chosen.ward_id)
      .maybeSingle();
    const l = data?.lgas as { name?: string; states?: { name?: string } } | null;
    return [l?.states?.name, l?.name, data?.name].filter(Boolean).join(" › ") || null;
  }
  if (level === "lga" && chosen.lga_id) {
    const { data } = await supabase.from("lgas").select("name, states(name)").eq("id", chosen.lga_id).maybeSingle();
    const s = data?.states as { name?: string } | null;
    return [s?.name, data?.name].filter(Boolean).join(" › ") || null;
  }
  if (level === "state" && chosen.state_id) {
    const { data } = await supabase.from("states").select("name").eq("id", chosen.state_id).maybeSingle();
    return data?.name ?? null;
  }
  return null;
}
