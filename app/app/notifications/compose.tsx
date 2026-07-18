"use client";

import { useActionState, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { sendAnnouncement, type AnnounceState } from "./actions";

const initial: AnnounceState = { status: "idle" };

// Leaders/admins broadcast to the members in their scope.
export function ComposeAnnouncement() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(sendAnnouncement, initial);
  const { toast } = useToast();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success" && state.message) toast(state.message, "success");
  }, [state, toast]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        Send an announcement
      </button>
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="text-sm font-semibold text-foreground">Send an announcement</p>
      <p className="mt-1 text-sm text-muted">Goes to every member in your scope who has a login.</p>
      <form action={action} className="mt-4 flex flex-col gap-4">
        <Input label="Headline" name="title" required error={fe.title} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-foreground">Message (optional)</span>
          <textarea
            name="body"
            rows={3}
            maxLength={1000}
            className="rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          />
        </label>
        {state.status === "error" && state.message ? (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        ) : null}
        {state.status === "success" ? <p className="text-sm text-accent">{state.message}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending}>
            Send
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </form>
    </div>
  );
}
