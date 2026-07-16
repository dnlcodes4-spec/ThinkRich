"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerMember, type RegisterState } from "./actions";

const initial: RegisterState = { status: "idle" };

export function RegisterMemberForm() {
  // Remount to fully reset the form + action state after a successful registration.
  const [instance, setInstance] = useState(0);
  return <Inner key={instance} onReset={() => setInstance((i) => i + 1)} />;
}

function Inner({ onReset }: { onReset: () => void }) {
  const [state, action, pending] = useActionState(registerMember, initial);
  const fe = state.fieldErrors ?? {};

  if (state.status === "success" && state.membershipNumber) {
    return (
      <div className="rounded-card border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">Member registered. Membership number:</p>
        <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-foreground">
          {state.membershipNumber}
        </p>
        <Button className="mt-6" onClick={onReset}>
          Register another member
        </Button>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Full name" name="full_name" autoComplete="name" required error={fe.full_name} />
        <Input
          label="Date of birth"
          name="date_of_birth"
          type="date"
          required
          hint="Must be 18 or older."
          error={fe.date_of_birth}
        />
        <Input label="NIN" name="nin" required hint="National ID number" error={fe.nin} />
        <Input label="VIN" name="vin" hint="Voter's ID number (optional)" error={fe.vin} />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="off"
          hint="For their login account (optional for now)"
          error={fe.email}
        />
        <Input label="Bank name" name="bank_name" error={fe.bank_name} />
        <Input label="Account name" name="account_name" error={fe.account_name} />
        <Input label="Account number" name="account_number" inputMode="numeric" error={fe.account_number} />
      </div>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" loading={pending} className="sm:self-start">
        Register member
      </Button>
    </form>
  );
}
