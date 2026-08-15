"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { useActionFeedback } from "@/components/ui/use-action-feedback";
import { addWard, type AddWardState } from "@/app/app/geography/add-ward/actions";
import { WARD_NAME_HINT } from "@/lib/ward";

const initial: AddWardState = { status: "idle" };

// Inline "can't find it? add it" for the ward step of a GeoPicker (mirrors the
// polling-unit version, CR-0018). When the desired ward is missing from the list,
// an LGA-level admin adds it here without leaving the flow; on success we reload
// the same page with the new ward selected (?ward=<id>), preserving the rest of
// the selection so account creation continues seamlessly. A ward must be a real
// row to be referenced by a profile or polling unit, so it is always saved.
export function GeoPickerAddWard({
  lgaId,
  action,
  params,
}: {
  lgaId: string;
  action: string;
  /** The current selection to preserve on redirect (e.g. state/lga + role). */
  params: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addWard, initial);
  const { error } = useActionFeedback(state);

  useEffect(() => {
    if (state.status !== "success" || !state.createdId) return;
    const qs = new URLSearchParams({ ...params, ward: state.createdId });
    router.push(`${action}?${qs.toString()}`);
  }, [state, action, params, router]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        Can&apos;t find your ward? Add it
      </button>
    );
  }

  return (
    <div className="w-full rounded-card border border-border bg-surface-muted p-4">
      <p className="text-sm font-semibold text-foreground">Add a ward to this LGA</p>
      <p className="mt-1 text-sm text-muted">
        It is saved to this LGA and selected for you, so you never type it again.
      </p>
      {/* Its own form: separate from the GET cascade around it. */}
      <form action={formAction} noValidate className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="lga_id" value={lgaId} />
        <Input label="Ward name" name="name" required hint={WARD_NAME_HINT} error={state.fieldErrors?.name} />
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
