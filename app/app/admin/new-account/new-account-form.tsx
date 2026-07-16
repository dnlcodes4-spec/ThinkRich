"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createAccount, type CreateAccountState } from "./actions";

type GeoOption = { id: string; name: string };

const initial: CreateAccountState = { status: "idle" };

export function NewAccountForm(props: {
  targetRoleLabel: string;
  geoLabel: string | null;
  geoOptions: GeoOption[];
}) {
  const [instance, setInstance] = useState(0);
  return <Inner key={instance} onReset={() => setInstance((i) => i + 1)} {...props} />;
}

function Inner({
  onReset,
  targetRoleLabel,
  geoLabel,
  geoOptions,
}: {
  onReset: () => void;
  targetRoleLabel: string;
  geoLabel: string | null;
  geoOptions: GeoOption[];
}) {
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
      <Input label="Full name" name="full_name" autoComplete="name" required error={fe.full_name} />
      <Input label="Email" name="email" type="email" autoComplete="off" required error={fe.email} />

      {geoLabel ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="geo_id" className="text-sm font-semibold text-foreground">
            {geoLabel}
          </label>
          <select
            id="geo_id"
            name="geo_id"
            required
            defaultValue=""
            aria-invalid={fe.geo_id ? true : undefined}
            className="min-h-11 rounded-sm border border-border bg-surface px-3 text-base text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          >
            <option value="" disabled>
              Select {geoLabel.toLowerCase()}…
            </option>
            {geoOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          {fe.geo_id ? <p className="text-xs text-danger">{fe.geo_id}</p> : null}
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" loading={pending} className="sm:self-start">
        Create {targetRoleLabel} account
      </Button>
    </form>
  );
}
