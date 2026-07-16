"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createNationalAdmin, type BootstrapState } from "./actions";

const initial: BootstrapState = { status: "idle" };

export function CreateNationalAdminForm() {
  const [instance, setInstance] = useState(0);
  return <Inner key={instance} onReset={() => setInstance((i) => i + 1)} />;
}

function Inner({ onReset }: { onReset: () => void }) {
  const [state, action, pending] = useActionState(createNationalAdmin, initial);
  const fe = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <div className="rounded-card border border-border bg-surface p-6">
        <p className="text-sm font-semibold text-foreground">National admin created</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Email</dt>
          <dd className="font-medium break-all">{state.email}</dd>
          <dt className="text-muted">Temp password</dt>
          <dd className="font-mono font-bold">{state.tempPassword}</dd>
        </dl>
        <p className="mt-4 rounded-md bg-surface-muted p-3 text-xs text-muted">
          Share these credentials, then have them change the password after first sign-in. This
          password will not be shown again.
        </p>
        <Button className="mt-5" onClick={onReset}>
          Create another
        </Button>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <Input label="Full name" name="full_name" autoComplete="name" required error={fe.full_name} />
      <Input label="Email" name="email" type="email" autoComplete="off" required error={fe.email} />
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" loading={pending} className="sm:self-start">
        Create national admin
      </Button>
    </form>
  );
}
