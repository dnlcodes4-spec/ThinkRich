"use client";

import { useActionState } from "react";
import { addMemberEmailAction, type ProvisionState } from "../provision-login";

const initial: ProvisionState = { status: "idle" };

// Inline "add a missing email" for the member detail page (CR-0025). Only rendered
// when the member has no email yet; the action also provisions their login and
// returns the one-time temporary password.
export function AddMemberEmail({ memberId }: { memberId: string }) {
  const [state, action, pending] = useActionState(addMemberEmailAction, initial);

  if (state.status === "success") {
    return (
      <div className="mt-1 text-sm">
        <p className="font-medium text-foreground break-all">{state.email}</p>
        {state.tempPassword ? (
          <p className="mt-1 text-xs text-muted">
            Login created. Temp password{" "}
            <span className="font-mono font-bold text-foreground break-all">{state.tempPassword}</span> — shown
            once, give it to the member.
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted">{state.message ?? "Email saved."}</p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="mt-1 flex flex-col items-start gap-1.5">
      <input type="hidden" name="member_id" value={memberId} />
      <span className="flex flex-wrap items-center gap-1.5">
        <input
          type="email"
          name="email"
          required
          aria-label="Voter email"
          placeholder="name@example.com"
          className="min-h-9 w-56 rounded-md border border-border bg-surface px-2.5 text-sm text-foreground placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-ring"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-9 rounded-md border border-ring px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add & provision login"}
        </button>
      </span>
      {state.status === "error" && state.message ? (
        <span className="text-xs text-danger">{state.message}</span>
      ) : null}
    </form>
  );
}
