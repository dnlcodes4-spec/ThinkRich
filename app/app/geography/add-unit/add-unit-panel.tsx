"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { useActionFeedback } from "@/components/ui/use-action-feedback";
import { addPollingUnit, type AddUnitState } from "./actions";
import { PU_NAME_HINT } from "@/lib/polling-unit";

const initial: AddUnitState = { status: "idle" };

type Unit = { id: string; name: string; code: string | null };

// Search the ward's existing units first (so nobody adds a duplicate), then, if
// it is genuinely missing, add it. The search is the whole point of the CR: it
// makes the existing units impossible to miss before typing a new one.
export function AddUnitPanel({
  wardId,
  wardLabel,
  units,
}: {
  wardId: string;
  wardLabel: string;
  units: Unit[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [state, action, pending] = useActionState(addPollingUnit, initial);
  const { error } = useActionFeedback(state);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) => u.name.toLowerCase().includes(q) || (u.code ?? "").toLowerCase().includes(q));
  }, [units, query]);

  // After a successful add, refresh so the new unit joins the list, and clear the
  // query so it is visible.
  const done = state.status === "success";
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => {
      setQuery("");
      router.refresh();
    }, 1200);
    return () => clearTimeout(t);
  }, [done, router]);

  return (
    <div className="mt-6 flex flex-col gap-8">
      <section>
        <h2 className="text-sm font-semibold text-foreground">
          Existing units in {wardLabel}{" "}
          <span className="font-normal text-muted">({units.length})</span>
        </h2>
        <p className="mt-1 text-sm text-muted">
          Search here first. Add a new one only if it is genuinely missing.
        </p>
        <div className="mt-3">
          <Input
            label="Search this ward"
            placeholder="Type a name or code…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ul className="mt-3 max-h-72 overflow-y-auto rounded-card border border-border divide-y divide-border">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No units match “{query}”.</li>
          ) : (
            filtered.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-sm text-foreground">{u.name}</span>
                {u.code ? <span className="shrink-0 text-xs text-muted">#{u.code}</span> : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Not listed? Add it</h2>
        <p className="mt-1 text-sm text-muted">
          It is saved to this ward so no one has to type it again. Names are stored in the standard
          uppercase format.
        </p>

        {done ? (
          <p role="status" className="mt-4 text-sm font-semibold text-success">
            Added “{state.createdName}”. It is now in the list above.
          </p>
        ) : (
          <form action={action} noValidate className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="ward_id" value={wardId} />
            <Input
              label="Polling unit name"
              name="name"
              required
              hint={PU_NAME_HINT}
              error={state.fieldErrors?.name}
            />
            <Input
              label="Unit code"
              name="code"
              hint="Optional. The number on the register, e.g. 008."
              error={state.fieldErrors?.code}
            />
            <FormError message={error} />
            <Button type="submit" loading={pending} className="sm:self-start">
              Add polling unit
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
