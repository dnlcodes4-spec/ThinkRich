"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { useActionFeedback } from "@/components/ui/use-action-feedback";
import { submitChangeRequest, type ChangeReqState } from "./change-request-actions";
import { CHANGE_FIELDS, CHANGE_FIELD_KEYS } from "@/app/app/members/change-request-fields";

const initial: ChangeReqState = { status: "idle" };

export function ChangeRequestForm() {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<string>(CHANGE_FIELD_KEYS[0]);
  const [state, action, pending] = useActionState(submitChangeRequest, initial);
  // This form shows its own persistent success panel below, so suppress the toast.
  const { error } = useActionFeedback(state, { artifact: true });
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
        <Select
          label="Field"
          name="field"
          value={field}
          onChange={(e) => setField(e.target.value)}
          error={fe.field}
        >
          {CHANGE_FIELD_KEYS.map((k) => (
            <option key={k} value={k}>
              {CHANGE_FIELDS[k].label}
            </option>
          ))}
        </Select>

        <Input label="New value" name="new_value" type={inputType} required error={fe.new_value} />

        <Textarea label="Reason (optional)" name="reason" rows={2} maxLength={300} />

        <FormError message={error} />

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
