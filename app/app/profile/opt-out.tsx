"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { requestOptOut, cancelOptOut, type OptOutState } from "@/app/app/members/lifecycle-actions";

const initial: OptOutState = { status: "idle" };

export function MembershipStatusPanel({
  status,
  retentionUntil,
}: {
  status: "active" | "frozen" | "deleted";
  retentionUntil: string | null;
}) {
  if (status === "frozen") return <FrozenPanel retentionUntil={retentionUntil} />;
  if (status === "active") return <OptOutPanel />;
  return null;
}

function fmt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
}

function FrozenPanel({ retentionUntil }: { retentionUntil: string | null }) {
  const until = fmt(retentionUntil);
  return (
    <div className="rounded-card border border-warning/40 bg-warning-soft p-5">
      <p className="text-sm font-semibold text-foreground">Your membership is paused</p>
      <p className="mt-1 text-sm text-muted">
        You asked to opt out.{" "}
        {until ? (
          <>
            It will be <strong className="font-semibold text-foreground">permanently deleted</strong> after{" "}
            {until}, unless you reactivate before then.
          </>
        ) : (
          "It is scheduled for permanent deletion after the retention period."
        )}{" "}
        Changed your mind?
      </p>
      <form action={cancelOptOut} className="mt-4">
        <Button type="submit">Reactivate my membership</Button>
      </form>
    </div>
  );
}

function OptOutPanel() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestOptOut, initial);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-danger underline-offset-4 hover:underline"
      >
        Opt out of the movement
      </button>
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="text-sm font-semibold text-foreground">Opt out of the movement</p>
      <p className="mt-1 text-sm text-muted">
        This pauses your membership right away. After the retention period it is{" "}
        <strong className="font-semibold text-foreground">permanently deleted</strong> and your
        details are erased, unless you reactivate before then.
      </p>
      <form action={action} className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Reason (optional)</span>
          <textarea
            name="reason"
            rows={3}
            maxLength={500}
            className="rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          />
        </label>
        {state.status === "error" && state.message ? (
          <p className="text-xs text-danger">{state.message}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="destructive" loading={pending}>
            Pause my membership
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Keep my membership
          </Button>
        </div>
      </form>
    </div>
  );
}
