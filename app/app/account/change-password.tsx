"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { FormError } from "@/components/ui/form-error";
import { useActionFeedback } from "@/components/ui/use-action-feedback";
import { changePassword, type ChangePasswordState } from "./actions";

const initial: ChangePasswordState = { status: "idle" };

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initial);
  const { error } = useActionFeedback(state, { successMessage: "Password changed." });
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="mt-4 flex max-w-sm flex-col gap-4">
      <PasswordInput
        label="New password"
        name="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        error={fe.password}
      />
      <PasswordInput
        label="Confirm new password"
        name="confirm"
        autoComplete="new-password"
        required
        error={fe.confirm}
      />

      <FormError message={error} />

      <Button type="submit" loading={pending} className="sm:self-start">
        Change password
      </Button>
    </form>
  );
}
