"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

type Con = { id: string; name: string; state_id: string };

// Picks the specific seat for an overlay office (Senate / House of Reps / State
// Assembly). The office already fixes the kind, so this is just state → seat.
// A state admin has their state locked, so they only see the seat dropdown.
export function ConstituencyChooser({
  officeId,
  constituencies,
  states,
  lockedStateId,
  initialConId,
}: {
  officeId: string;
  constituencies: Con[];
  states: { id: string; name: string }[];
  lockedStateId?: string;
  initialConId?: string;
}) {
  const router = useRouter();
  const initialStateId =
    lockedStateId ?? constituencies.find((c) => c.id === initialConId)?.state_id ?? "";
  const [stateId, setStateId] = useState(initialStateId);
  const [conId, setConId] = useState(initialConId ?? "");

  const options = useMemo(
    () => constituencies.filter((c) => c.state_id === stateId),
    [constituencies, stateId],
  );

  function choose(id: string) {
    setConId(id);
    if (id) router.push(`/app/admin/candidates?office=${officeId}&con=${id}`);
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      {!lockedStateId ? (
        <div className="min-w-0 flex-1">
          <Select
            label="State"
            value={stateId}
            onChange={(e) => {
              setStateId(e.target.value);
              setConId("");
            }}
          >
            <option value="">Choose a state</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <Select
          label="Seat"
          value={conId}
          onChange={(e) => choose(e.target.value)}
          disabled={!stateId}
          hint={stateId ? undefined : "Choose a state first"}
        >
          <option value="">{options.length ? "Choose a seat" : "No seats in this state"}</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
