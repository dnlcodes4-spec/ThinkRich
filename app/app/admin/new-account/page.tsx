import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GeoPicker } from "@/components/geo-picker";
import { NewAccountForm } from "./new-account-form";
import { allowedTargets, ROLE_LEVEL, LEVEL_LABEL, roleLabel, type Role } from "./tiers";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

// A national admin may create ANY role below them, anywhere in the country. Every
// other admin provisions the next tier down, inside their own scope. The Server
// Action re-checks both rules (the service role bypasses RLS).
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

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Create an account</h1>
      <p className="mt-2 text-sm text-muted">
        {unscoped
          ? "You can create any role, anywhere in the country. They receive a temporary password to sign in with."
          : "You can provision the next tier below your role, within your own area. They receive a temporary password to sign in with."}
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

      {target && level ? (
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
          />
        </section>
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
