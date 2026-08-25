"use client";

import { useActionState } from "react";
import { VinInput } from "@/components/ui/vin-input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { saveTestVin, deleteTestVin, type VinCheckState } from "./actions";

const initial: VinCheckState = { status: "idle" };

export function VinCheckForm() {
  const [saveState, saveAction, savePending] = useActionState(saveTestVin, initial);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTestVin, initial);

  const savedVin = saveState.status === "success" ? saveState.vin : undefined;
  const deleted = deleteState.status === "success";

  return (
    <div className="mt-5 flex flex-col gap-4">
      <form action={saveAction} className="flex flex-col gap-3">
        <VinInput
          name="vin"
          label="VIN to test"
          error={saveState.status === "error" ? saveState.message : undefined}
        />
        <Button type="submit" disabled={savePending}>
          {savePending ? "Saving…" : "Save"}
        </Button>
      </form>

      {saveState.status === "error" && <FormError message={saveState.message} />}

      {savedVin && !deleted && (
        <div className="rounded-card border border-border bg-surface-muted p-4 text-sm">
          <p className="font-medium text-foreground">
            {saveState.alreadyExisted
              ? "Saved: this VIN already had a row, and the save still succeeded (this is the exact case that used to fail)."
              : "Saved: a new row was created."}
          </p>
          <p className="mt-1 font-mono text-xs text-muted">{savedVin}</p>
          <form action={deleteAction} className="mt-3">
            <input type="hidden" name="vin" value={savedVin} />
            <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>
              {deletePending ? "Deleting…" : "Delete this test VIN"}
            </Button>
          </form>
        </div>
      )}

      {deleteState.status === "error" && <FormError message={deleteState.message} />}
      {deleted && <p className="text-sm font-medium text-foreground">Deleted. Nothing left behind.</p>}
    </div>
  );
}
