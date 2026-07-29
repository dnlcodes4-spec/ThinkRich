"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { VinInput } from "@/components/ui/vin-input";
import { Button } from "@/components/ui/button";
import { registerMember, type RegisterState } from "./actions";

const initial: RegisterState = { status: "idle" };

export type RegisterFormProps = {
  /** Set only for the National Coordinator, who chooses the polling unit. */
  pollingUnitId: string | null;
  /** Leaders in that polling unit, offered so the member stays inside the chain. */
  leaders: { id: string; full_name: string }[] | null;
};

export function RegisterMemberForm(props: RegisterFormProps) {
  // Remount to fully reset the form + action state after a successful registration.
  const [instance, setInstance] = useState(0);
  return <Inner key={instance} onReset={() => setInstance((i) => i + 1)} {...props} />;
}

function Inner({ onReset, pollingUnitId, leaders }: RegisterFormProps & { onReset: () => void }) {
  const [state, action, pending] = useActionState(registerMember, initial);
  const fe = state.fieldErrors ?? {};

  if (state.status === "success" && state.membershipNumber) {
    return (
      <div className="rounded-card border border-border bg-surface p-6">
        <div className="text-center">
          <p className="text-sm text-muted">Member registered. Membership number:</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-foreground">
            {state.membershipNumber}
          </p>
        </div>

        {state.loginTempPassword ? (
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-sm font-semibold text-foreground">Login created</p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Email</dt>
              <dd className="font-medium break-all">{state.loginEmail}</dd>
              <dt className="text-muted">Temp password</dt>
              <dd className="font-mono font-bold break-all">{state.loginTempPassword}</dd>
            </dl>
            <p className="mt-3 rounded-md bg-surface-muted p-3 text-xs text-muted">
              Give these to the member. Ask them to change the password after their first sign-in.
              This password will not be shown again.
            </p>
          </div>
        ) : state.loginNote ? (
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-sm text-muted">
              Member saved, but their login was not created: {state.loginNote} You can provision it
              later from the members list.
            </p>
          </div>
        ) : null}

        <Button className="mt-6" onClick={onReset}>
          Register another member
        </Button>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-8">
      {pollingUnitId ? <input type="hidden" name="polling_unit_id" value={pollingUnitId} /> : null}

      {leaders ? (
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold text-foreground">
            Assign to a leader <span className="font-normal text-muted">(optional)</span>
          </legend>
          <p className="mb-4 text-sm text-muted">
            {leaders.length > 0
              ? "The member counts towards that leader's ten. Leave it unassigned to hold them yourself."
              : "No leader has been created in this polling unit yet, so you will hold this member yourself."}
          </p>
          {leaders.length > 0 ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-foreground">Leader</span>
              <select
                name="registered_by"
                defaultValue=""
                aria-invalid={fe.registered_by ? true : undefined}
                className="min-h-11 rounded-sm border border-border bg-surface px-3 text-base text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring"
              >
                <option value="">No leader (I will hold this member)</option>
                {leaders.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name}
                  </option>
                ))}
              </select>
              {fe.registered_by ? <span className="text-xs text-danger">{fe.registered_by}</span> : null}
            </label>
          ) : null}
        </fieldset>
      ) : null}

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="mb-4 text-sm font-semibold text-foreground">Member details</legend>
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
          <VinInput error={fe.vin} />
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground">Gender</span>
            <select
              name="gender"
              required
              defaultValue=""
              aria-invalid={fe.gender ? true : undefined}
              className="min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring"
            >
              <option value="" disabled>
                Select&hellip;
              </option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            {fe.gender ? <span className="text-sm text-danger">{fe.gender}</span> : null}
          </label>
        </div>
      </fieldset>

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold text-foreground">
          Bank details <span className="font-normal text-muted">(optional)</span>
        </legend>
        <p className="mb-4 text-sm text-muted">Used for member rewards. You can add this later.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Bank name" name="bank_name" error={fe.bank_name} />
          <Input label="Account name" name="account_name" error={fe.account_name} />
          <Input label="Account number" name="account_number" inputMode="numeric" error={fe.account_number} />
        </div>
      </fieldset>

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold text-foreground">
          Login <span className="font-normal text-muted">(optional)</span>
        </legend>
        <p className="mb-4 text-sm text-muted">
          Add an email to create their app login now. We show a temporary password once.
        </p>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="off"
          error={fe.email}
        />
      </fieldset>

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
