"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { useActionFeedback } from "@/components/ui/use-action-feedback";
import { addPollingUnit, type AddUnitState } from "@/app/app/geography/add-unit/actions";
import { PU_NAME_HINT } from "@/lib/polling-unit";

const initial: AddUnitState = { status: "idle" };

// Inline "can't find it? add it" for the polling-unit step of a GeoPicker (CR-0018).
// When the desired unit is missing from the list, the admin adds it here without
// leaving the flow; on success we reload the same page with the new unit selected
// (?pu=<id>), preserving the rest of the selection so registration/provisioning
// continues seamlessly. A polling unit must be a real row to be referenced by a
// member or leader, so it is always saved.
export function GeoPickerAddUnit({
  wardId,
  action,
  params,
}: {
  wardId: string;
  action: string;
  /** The current selection to preserve on redirect (e.g. state/lga/ward + role). */
  params: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addPollingUnit, initial);
  const { error } = useActionFeedback(state);

  useEffect(() => {
    if (state.status !== "success" || !state.createdId) return;
    const qs = new URLSearchParams({ ...params, pu: state.createdId });
    router.push(`${action}?${qs.toString()}`);
  }, [state, action, params, router]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        Can&apos;t find your polling unit? Add it
      </button>
    );
  }

  return (
    <div className="w-full rounded-card border border-border bg-surface-muted p-4">
      <p className="text-sm font-semibold text-foreground">Add a polling unit to this ward</p>
      <p className="mt-1 text-sm text-muted">
        It is saved to this ward and selected for you, so you never type it again.
      </p>
      {/* Its own form: separate from the GET cascade around it. */}
      <form action={formAction} noValidate className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="ward_id" value={wardId} />
        <Input label="Polling unit name" name="name" required hint={PU_NAME_HINT} error={state.fieldErrors?.name} />
        <Input label="Unit code" name="code" hint="Optional, e.g. 008." error={state.fieldErrors?.code} />
        <FormError message={error} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={pending}>
            Add and select
          </Button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
