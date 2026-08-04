"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { useActionFeedback } from "@/components/ui/use-action-feedback";
import { idle } from "@/lib/action-state";
import { saveMembership } from "./actions";

type Ward = { id: string; name: string };
type Lga = { id: string; name: string; wards: Ward[] };

// Ward-grain membership editor. The admin ticks the wards that make up a
// constituency; "Select all"/"Clear" per LGA handle the common bulk case. Wards
// already covered by a whole-LGA rule (imported federal seats) are shown as such
// and left out of the editable set, so saving never disturbs that data.
export function AreaEditor({
  constituencyId,
  lgas,
  initialWardIds,
  lgaCoveredWardIds,
}: {
  constituencyId: string;
  lgas: Lga[];
  initialWardIds: string[];
  lgaCoveredWardIds: string[];
}) {
  const coveredViaLga = useMemo(() => new Set(lgaCoveredWardIds), [lgaCoveredWardIds]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialWardIds));
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState("");

  const [state, action, pending] = useActionState(saveMembership, idle);
  const { error } = useActionFeedback(state);

  const q = filter.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!q) return lgas;
    return lgas
      .map((l) => ({
        ...l,
        wards: l.wards.filter(
          (w) => w.name.toLowerCase().includes(q) || l.name.toLowerCase().includes(q),
        ),
      }))
      .filter((l) => l.wards.length > 0);
  }, [lgas, q]);

  function toggleWard(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function setLga(l: Lga, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const w of l.wards) {
        if (on) next.add(w.id);
        else next.delete(w.id);
      }
      return next;
    });
  }
  function toggleOpen(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalCovered = useMemo(() => {
    const all = new Set(selected);
    for (const w of coveredViaLga) all.add(w);
    return all.size;
  }, [selected, coveredViaLga]);
  const lgasTouched = lgas.filter((l) =>
    l.wards.some((w) => selected.has(w.id) || coveredViaLga.has(w.id)),
  ).length;

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="constituency_id" value={constituencyId} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="ward_ids" value={id} />
      ))}

      {/* sticky summary + save */}
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border sm:px-4">
        <p className="text-sm text-foreground">
          This seat covers <span className="font-semibold">{totalCovered.toLocaleString()}</span> ward
          {totalCovered === 1 ? "" : "s"} in{" "}
          <span className="font-semibold">{lgasTouched}</span> LGA{lgasTouched === 1 ? "" : "s"}
        </p>
        <Button type="submit" loading={pending}>
          Save
        </Button>
      </div>

      <FormError message={error} />

      <p className="mt-4 text-sm text-muted">
        Tick every ward that belongs to this seat. Use <span className="font-semibold">Select all</span>{" "}
        to take a whole LGA at once.
      </p>

      <div className="mt-3">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter LGAs or wards…"
          className="min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-ring"
        />
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {visible.map((l) => {
          const total = l.wards.length;
          const chosen = l.wards.filter((w) => selected.has(w.id)).length;
          const isOpen = open.has(l.id) || q.length > 0;
          return (
            <li key={l.id} className="overflow-hidden rounded-card border border-border bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleOpen(l.id)}
                  aria-expanded={isOpen}
                  className="flex items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block transition-transform ${isOpen ? "rotate-90" : ""} text-muted`}
                  >
                    ›
                  </span>
                  <span className="text-sm font-semibold text-foreground">{l.name}</span>
                  <span className="text-xs text-muted">
                    {chosen}/{total}
                  </span>
                </button>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLga(l, true)}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setLga(l, false)}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-muted"
                  >
                    Clear
                  </button>
                </span>
              </div>
              {isOpen ? (
                <ul className="grid grid-cols-1 gap-px border-t border-border bg-border sm:grid-cols-2">
                  {l.wards.map((w) => {
                    const viaLga = coveredViaLga.has(w.id);
                    return (
                      <li key={w.id} className="bg-surface">
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.has(w.id)}
                            onChange={() => toggleWard(w.id)}
                            className="size-4 shrink-0 rounded border-border text-primary focus:ring-ring"
                          />
                          <span className="min-w-0 text-sm text-foreground">{w.name}</span>
                          {viaLga ? (
                            <span className="ml-auto shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[0.6875rem] font-semibold text-muted">
                              via whole LGA
                            </span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No LGAs or wards match “{filter}”.</p>
      ) : null}
    </form>
  );
}
