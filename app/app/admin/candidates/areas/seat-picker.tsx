"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Select } from "@/components/ui/select";

// Plain-language kinds. The database calls these senatorial_district etc.; here
// they are the names people actually use.
const KINDS = [
  { value: "senatorial_district", label: "Senate", hint: "Senator" },
  { value: "federal_constituency", label: "House of Representatives", hint: "Federal member" },
  { value: "state_constituency", label: "State Assembly", hint: "State member" },
];

type Seat = { id: string; name: string; kind: string; state_id: string };

// Step-by-step chooser: state → kind of seat → the specific seat. Dependent
// dropdowns keep the choice small at every step, which is far friendlier than one
// search box holding every constituency in the country.
export function SeatPicker({
  states,
  seats,
  initial,
}: {
  states: { id: string; name: string }[];
  seats: Seat[];
  initial?: { state?: string; kind?: string; c?: string };
}) {
  const router = useRouter();
  const [stateId, setStateId] = useState(initial?.state ?? "");
  const [kind, setKind] = useState(initial?.kind ?? "");
  const [seatId, setSeatId] = useState(initial?.c ?? "");

  const seatOptions = useMemo(
    () => seats.filter((s) => s.state_id === stateId && s.kind === kind),
    [seats, stateId, kind],
  );

  // Load the wards as soon as a seat is chosen, rather than behind a separate
  // button: once the wards are on screen a "show" button just points at the seat
  // that's already open, which reads as broken.
  function chooseSeat(id: string) {
    setSeatId(id);
    if (id) router.push(`/app/admin/candidates/areas?c=${id}`);
  }

  return (
    <div className="mt-6 flex flex-col gap-6 rounded-card border border-border bg-surface p-4 sm:p-6">
      <Field n={1} title="Which state?">
        <Select
          aria-label="State"
          value={stateId}
          onChange={(e) => {
            setStateId(e.target.value);
            setKind("");
            setSeatId("");
          }}
        >
          <option value="">Choose a state</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>

      {stateId ? (
        <Field n={2} title="Which kind of seat?">
          <div className="flex flex-col gap-2">
            {KINDS.map((k) => (
              <label
                key={k.value}
                className="flex cursor-pointer items-center gap-3 rounded-sm border border-border px-3 py-2.5 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="kind"
                  value={k.value}
                  checked={kind === k.value}
                  onChange={() => {
                    setKind(k.value);
                    setSeatId("");
                  }}
                  className="size-4 shrink-0 text-primary focus:ring-ring"
                />
                <span className="text-sm font-semibold text-foreground">{k.label}</span>
                <span className="text-xs text-muted">{k.hint}</span>
              </label>
            ))}
          </div>
        </Field>
      ) : null}

      {stateId && kind ? (
        <Field n={3} title="Which seat?">
          {seatOptions.length === 0 ? (
            <p className="text-sm text-muted">No seats of this kind in this state yet.</p>
          ) : (
            <>
              <Select
                aria-label="Seat"
                value={seatId}
                onChange={(e) => chooseSeat(e.target.value)}
              >
                <option value="">Choose a seat</option>
                {seatOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted">Its wards appear below as soon as you choose.</p>
            </>
          )}
        </Field>
      ) : null}
    </div>
  );
}

function Field({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[0.6875rem] font-bold text-primary-foreground">
          {n}
        </span>
        {title}
      </p>
      {children}
    </div>
  );
}
