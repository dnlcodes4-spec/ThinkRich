"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { useActionFeedback } from "@/components/ui/use-action-feedback";
import { sendAnnouncement, type AnnounceState } from "./actions";

const initial: AnnounceState = { status: "idle" };

// Leaders/admins broadcast to the members in their scope.
export function ComposeAnnouncement() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(sendAnnouncement, initial);
  const { error } = useActionFeedback(state, { successMessage: "Announcement sent." });
  const fe = state.fieldErrors ?? {};

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
        <Textarea label="Message (optional)" name="body" rows={3} maxLength={1000} />
        <FormError message={error} />
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
