import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setStateActive } from "./actions";

export const metadata: Metadata = {
  title: "States",
  robots: { index: false, follow: false },
};

// National-admin only: activate/deactivate states, with per-state context (LGAs,
// state admins, active members). A state is inactive until it has a state admin.
export default async function StatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (me?.role !== "national_admin") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">States</h1>
        <p className="text-sm text-muted">This area is for the national admin.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const admin = createAdminClient();
  const [statesRes, lgasRes, adminsRes, membersRes] = await Promise.all([
    admin.from("states").select("id, name, code, is_active").order("name"),
    admin.from("lgas").select("state_id"),
    admin.from("profiles").select("state_id").eq("role", "state_admin"),
    admin.from("members").select("state_id").neq("status", "deleted"),
  ]);

  const tally = (rows: { state_id: string | null }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) if (r.state_id) m.set(r.state_id, (m.get(r.state_id) ?? 0) + 1);
    return m;
  };
  const lgaBy = tally(lgasRes.data);
  const adminBy = tally(adminsRes.data);
  const memberBy = tally(membersRes.data);

  const states = statesRes.data ?? [];
  const activeCount = states.filter((s) => s.is_active).length;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">States</h1>
      <p className="mt-1 text-sm text-muted">
        {activeCount} of {states.length} active. A state should be active once it has a state admin.
      </p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <caption className="sr-only">States and activation</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-semibold">State</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 text-right font-semibold">Admins</th>
              <th className="px-3 py-2 text-right font-semibold">LGAs</th>
              <th className="px-3 py-2 text-right font-semibold">Members</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {states.map((s) => {
              const admins = adminBy.get(s.id) ?? 0;
              return (
                <tr key={s.id} className="border-b border-border">
                  <td className="px-3 py-3">
                    <span className="font-medium text-foreground">{s.name}</span>{" "}
                    <span className="font-mono text-xs text-muted">{s.code}</span>
                  </td>
                  <td className="px-3 py-3">
                    {s.is_active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">
                        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">{admins}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted">{lgaBy.get(s.id) ?? 0}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">{memberBy.get(s.id) ?? 0}</td>
                  <td className="px-3 py-3 text-right">
                    <form action={setStateActive}>
                      <input type="hidden" name="state_id" value={s.id} />
                      <input type="hidden" name="active" value={s.is_active ? "false" : "true"} />
                      <button
                        type="submit"
                        className={
                          s.is_active
                            ? "min-h-9 rounded-md border border-ring px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
                            : "min-h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                        }
                        title={!s.is_active && admins === 0 ? "No state admin assigned yet" : undefined}
                      >
                        {s.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
