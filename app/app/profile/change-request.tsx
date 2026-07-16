"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitChangeRequest, type ChangeReqState } from "./change-request-actions";
import { CHANGE_FIELDS, CHANGE_FIELD_KEYS } from "@/app/app/members/change-request-fields";

const initial: ChangeReqState = { status: "idle" };

export function ChangeRequestForm() {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<string>(CHANGE_FIELD_KEYS[0]);
  const [state, action, pending] = useActionState(submitChangeRequest, initial);
  const fe = state.fieldErrors ?? {};

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        Request a correction
      </button>
    );
  }

  if (state.status === "success") {
    return (
      <div className="rounded-card border border-border bg-surface p-5">
        <p className="text-sm text-foreground">{state.message}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-3 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Done
        </button>
      </div>
    );
  }

  const inputType = CHANGE_FIELDS[field as keyof typeof CHANGE_FIELDS]?.type ?? "text";

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="text-sm font-semibold text-foreground">Request a correction</p>
      <p className="mt-1 text-sm text-muted">
        A coordinator reviews your request before it is applied. You can request one change per field
        at a time.
      </p>
      <form action={action} className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-foreground">Field</span>
          <select
            name="field"
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="min-h-11 rounded-sm border border-border bg-surface px-3 text-base text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          >
            {CHANGE_FIELD_KEYS.map((k) => (
              <option key={k} value={k}>
                {CHANGE_FIELDS[k].label}
              </option>
            ))}
          </select>
          {fe.field ? <span className="text-xs text-danger">{fe.field}</span> : null}
        </label>

        <Input label="New value" name="new_value" type={inputType} required error={fe.new_value} />

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-foreground">Reason (optional)</span>
          <textarea
            name="reason"
            rows={2}
            maxLength={300}
            className="rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          />
        </label>

        {state.status === "error" && state.message ? (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending}>
            Submit request
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
