"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { useActionFeedback } from "@/components/ui/use-action-feedback";
import { addMyVin, type AddVinState } from "./actions";
import { VIN_HINT } from "@/lib/vin";

const initial: AddVinState = { status: "idle" };

// Anytime self-serve version of the activation prompt, for the account page.
export function AddVinForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(addMyVin, initial);
  const { error } = useActionFeedback(state);
  const done = state.status === "success";

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.refresh(), 1200);
    return () => clearTimeout(t);
  }, [done, router]);

  if (done) {
    return (
      <p role="status" className="mt-3 text-sm font-semibold text-success">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} noValidate className="mt-3 flex flex-col gap-4 sm:max-w-sm">
      <Input
        label="Voter's card number (VIN)"
        name="vin"
        autoComplete="off"
        required
        hint={VIN_HINT}
        error={state.fieldErrors?.vin}
      />
      <FormError message={error} />
      <Button type="submit" loading={pending} className="sm:self-start">
        Save and activate
      </Button>
    </form>
  );
}
