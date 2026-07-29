"use client";

import { useActionState, useState } from "react";
import { changeRole, type RoleChangeState } from "@/app/app/members/role-actions";
import { roleLabel, type Role } from "@/app/app/admin/new-account/tiers";

const initial: RoleChangeState = { status: "idle" };

// Change someone's role (T-046 / T-049, CR-0009 §3.3).
//
// Collapsed by default: this sits on every row of the team list, and a role
// picker permanently open on each one would make the page read as a form rather
// than a roster. Opening it is a deliberate act, which suits a change that grants
// or removes authority.
export function ChangeRoleButton({
  id,
  name,
  currentRole,
  options,
}: {
  id: string;
  name: string;
  currentRole: Role;
  options: Role[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(changeRole, initial);

  const choices = options.filter((r) => r !== currentRole);
  if (choices.length === 0) return null;

  if (!open && state.status !== "success") {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-9 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
      >
        Change role
      </button>
    );
  }

  if (state.status === "success") {
    return <p className="text-xs font-semibold text-success">{state.message}</p>;
  }

  return (
    <div className="w-full">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="profile_id" value={id} />
        <label className="sr-only" htmlFor={`role-${id}`}>
          New role for {name}
        </label>
        <select
          id={`role-${id}`}
          name="new_role"
          defaultValue=""
          required
          className="min-h-9 rounded-sm border border-border bg-surface px-2 text-xs capitalize text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring"
        >
          <option value="" disabled>
            Move {name} to&hellip;
          </option>
          {choices.map((r) => (
            <option key={r} value={r} className="capitalize">
              {roleLabel(r)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="min-h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Apply"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-9 rounded-md px-2 text-xs font-semibold text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </form>
      {state.status === "error" && state.message ? (
        // Carries the database's own wording for a blocked demotion, which names
        // how many members are still attached.
        <p className="mt-2 text-xs font-semibold text-danger">{state.message}</p>
      ) : null}
    </div>
  );
}
