"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { sendVotingReminder, type ReminderState } from "./actions";

const initial: ReminderState = { status: "idle" };

// Manual N1 campaign: nudge members in scope to check their candidates.
export function VotingReminderButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(sendVotingReminder, initial);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-ring px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
      >
        Send a voting reminder
      </button>
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="text-sm font-semibold text-foreground">Send a voting reminder</p>
      <p className="mt-1 text-sm text-muted">
        Nudges every member in your scope who has a login to check their candidates. Personalised by
        LGA where a chairman candidate is set; links to their voting screen.
      </p>
      <form action={action} className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" loading={pending}>
          Send reminder
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Close
        </Button>
      </form>
      {state.status === "error" && state.message ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? <p className="mt-3 text-sm text-accent">{state.message}</p> : null}
    </div>
  );
}
