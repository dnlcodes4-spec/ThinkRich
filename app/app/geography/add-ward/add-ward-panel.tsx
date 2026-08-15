"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { useActionFeedback } from "@/components/ui/use-action-feedback";
import { addWard, type AddWardState } from "./actions";
import { WARD_NAME_HINT } from "@/lib/ward";

const initial: AddWardState = { status: "idle" };

type Ward = { id: string; name: string };

// Search the LGA's existing wards first (so nobody adds a duplicate), then, if it
// is genuinely missing, add it. The search is the point: it makes the existing
// wards impossible to miss before typing a new one.
export function AddWardPanel({
  lgaId,
  lgaLabel,
  wards,
}: {
  lgaId: string;
  lgaLabel: string;
  wards: Ward[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [state, action, pending] = useActionState(addWard, initial);
  const { error } = useActionFeedback(state);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return wards;
    return wards.filter((w) => w.name.toLowerCase().includes(q));
  }, [wards, query]);

  // After a successful add, refresh so the new ward joins the list, and clear the
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
          Existing wards in {lgaLabel} <span className="font-normal text-muted">({wards.length})</span>
        </h2>
        <p className="mt-1 text-sm text-muted">Search here first. Add a new one only if it is genuinely missing.</p>
        <div className="mt-3">
          <Input
            label="Search this LGA"
            placeholder="Type a ward name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ul className="mt-3 max-h-72 overflow-y-auto rounded-card border border-border divide-y divide-border">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No wards match “{query}”.</li>
          ) : (
            filtered.map((w) => (
              <li key={w.id} className="px-4 py-2.5 text-sm text-foreground">
                {w.name}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Not listed? Add it</h2>
        <p className="mt-1 text-sm text-muted">
          It is saved to this LGA so no one has to type it again, and gets its ward number automatically.
        </p>

        {done ? (
          <p role="status" className="mt-4 text-sm font-semibold text-success">
            Added “{state.createdName}”. It is now in the list above.
          </p>
        ) : (
          <form action={action} noValidate className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="lga_id" value={lgaId} />
            <Input label="Ward name" name="name" required hint={WARD_NAME_HINT} error={state.fieldErrors?.name} />
            <FormError message={error} />
            <Button type="submit" loading={pending} className="sm:self-start">
              Add ward
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
