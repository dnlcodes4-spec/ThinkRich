"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAdminAccount, type DeleteAccountState } from "./actions";

const initial: DeleteAccountState = { status: "idle" };

/**
 * Permanent delete, kept behind a deliberate step. Deactivation is the everyday
 * action; this one names the consequence and requires typing the person's name,
 * so it cannot be hit by accident from a row of buttons.
 */
export function DeleteAccountButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAdminAccount, initial);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-9 rounded-md px-3 text-xs font-semibold text-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Delete
      </button>
    );
  }

  return (
    <form action={action} className="w-full rounded-card border border-danger/40 bg-danger-soft p-4">
      <input type="hidden" name="profile_id" value={id} />
      <p className="text-sm font-semibold text-foreground">Delete {name} permanently?</p>
      <p className="mt-1 text-sm text-muted">
        This removes their account and sign-in for good. It cannot be undone. Their past activity
        stays on record. If they still have members, reassign those first.
      </p>

      <div className="mt-3 max-w-xs">
        <Input
          label={`Type "${name}" to confirm`}
          name="confirm_name"
          autoComplete="off"
          required
        />
      </div>

      {state.status === "error" && state.message ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" size="sm" loading={pending}>
          Delete permanently
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
