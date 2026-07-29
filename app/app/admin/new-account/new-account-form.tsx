"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { VinInput } from "@/components/ui/vin-input";
import { Button } from "@/components/ui/button";
import { createAccount, type CreateAccountState } from "./actions";

const initial: CreateAccountState = { status: "idle" };

type Scope = {
  state_id?: string;
  lga_id?: string;
  ward_id?: string;
  polling_unit_id?: string;
};

type Props = { targetRole: string; targetRoleLabel: string; scope: Scope };

export function NewAccountForm(props: Props) {
  const [instance, setInstance] = useState(0);
  return <Inner key={instance} onReset={() => setInstance((i) => i + 1)} {...props} />;
}

function Inner({ onReset, targetRole, targetRoleLabel, scope }: Props & { onReset: () => void }) {
  const [state, action, pending] = useActionState(createAccount, initial);
  const fe = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <div className="rounded-card border border-border bg-surface p-6">
        <p className="text-sm font-semibold text-foreground">Account created</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Role</dt>
          <dd className="font-medium capitalize">{state.role?.replace(/_/g, " ")}</dd>
          <dt className="text-muted">Email</dt>
          <dd className="font-medium">{state.email}</dd>
          <dt className="text-muted">Temp password</dt>
          <dd className="font-mono font-bold">{state.tempPassword}</dd>
        </dl>
        <p className="mt-4 rounded-md bg-surface-muted p-3 text-xs text-muted">
          Share these credentials with the new user. Ask them to change the password after their
          first sign-in. This password will not be shown again.
        </p>
        <Button className="mt-5" onClick={onReset}>
          Create another
        </Button>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="target_role" value={targetRole} />
      {scope.state_id ? <input type="hidden" name="state_id" value={scope.state_id} /> : null}
      {scope.lga_id ? <input type="hidden" name="lga_id" value={scope.lga_id} /> : null}
      {scope.ward_id ? <input type="hidden" name="ward_id" value={scope.ward_id} /> : null}
      {scope.polling_unit_id ? <input type="hidden" name="polling_unit_id" value={scope.polling_unit_id} /> : null}

      <Input label="Full name" name="full_name" autoComplete="name" required error={fe.full_name} />
      <Input label="Email" name="email" type="email" autoComplete="off" required error={fe.email} />
      <VinInput error={fe.vin} />

      {fe.geo ? <p className="text-xs text-danger">{fe.geo}</p> : null}

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" loading={pending} className="capitalize sm:self-start">
        Create {targetRoleLabel} account
      </Button>
    </form>
  );
}
