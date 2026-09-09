"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { VinInput } from "@/components/ui/vin-input";
import { NATIONWIDE_LABEL } from "@/lib/partners";
import {
  updatePartner,
  addPartnerAdmin,
  resetPartnerAdminPassword,
  type PartnerActionState,
} from "./actions";

const initial: PartnerActionState = { status: "idle" };

type StateOption = { id: string; name: string };
type Admin = { id: string; full_name: string; status: string };

function Credentials({ email, tempPassword }: { email?: string; tempPassword?: string }) {
  return (
    <div className="mt-4 rounded-card border border-border bg-surface p-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Email</dt>
        <dd className="font-medium break-all">{email}</dd>
        <dt className="text-muted">Temp password</dt>
        <dd className="font-mono font-bold">{tempPassword}</dd>
      </dl>
      <p className="mt-3 text-xs text-muted">
        Share these with the admin. They must change the password at first sign-in. It will not be
        shown again.
      </p>
    </div>
  );
}

export function EditPartnerDetails({
  partnerId,
  name,
  scopeStateId,
  states,
}: {
  partnerId: string;
  name: string;
  scopeStateId: string | null;
  states: StateOption[];
}) {
  const [state, action, pending] = useActionState(updatePartner, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-semibold text-foreground">Edit details</h2>
      <form action={action} className="mt-4 grid gap-4 sm:max-w-md">
        <input type="hidden" name="partner_id" value={partnerId} />
        <Input label="Name" name="name" defaultValue={name} required error={fe.name} />
        <Select
          label="Ceiling"
          name="scopeStateId"
          defaultValue={scopeStateId ?? ""}
          hint="Where the partner may register people. Widening is always allowed; narrowing needs everyone to already fit."
          error={fe.scopeStateId}
        >
          <option value="">{NATIONWIDE_LABEL}</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        {state.status === "error" ? <FormError message={state.message} /> : null}
        {state.status === "success" ? (
          <p className="text-sm font-medium text-success">Saved.</p>
        ) : null}
        <div>
          <Button type="submit" loading={pending}>
            Save changes
          </Button>
        </div>
      </form>
    </section>
  );
}

export function PartnerAdmins({
  partnerId,
  admins,
}: {
  partnerId: string;
  admins: Admin[];
}) {
  const [addState, addAction, adding] = useActionState(addPartnerAdmin, initial);
  const [resetState, resetAction, resetting] = useActionState(resetPartnerAdminPassword, initial);
  const addFe = addState.fieldErrors ?? {};

  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-semibold text-foreground">Who runs it</h2>

      {admins.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          This partner has no admin account. Onboarding creates one, so this is unusual.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-card border border-border">
          {admins.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{a.full_name}</p>
                <p className="text-xs text-muted">{a.status === "active" ? "Active" : "Inactive"}</p>
              </div>
              <form action={resetAction}>
                <input type="hidden" name="profile_id" value={a.id} />
                <Button type="submit" variant="secondary" size="sm" loading={resetting}>
                  Reset password
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {resetState.status === "success" ? (
        <Credentials email={resetState.email} tempPassword={resetState.tempPassword} />
      ) : null}
      {resetState.status === "error" ? (
        <div className="mt-3">
          <FormError message={resetState.message} />
        </div>
      ) : null}

      <details className="mt-6 rounded-card border border-border bg-surface-muted p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          Add another admin
        </summary>
        <form action={addAction} className="mt-4 grid gap-4 sm:max-w-md">
          <input type="hidden" name="partner_id" value={partnerId} />
          <Input label="Full name" name="adminFullName" required error={addFe.adminFullName} />
          <Input label="Email" name="adminEmail" type="email" required error={addFe.adminEmail} />
          <VinInput label="Voter's card number (VIN)" name="adminVin" required error={addFe.adminVin} />
          <Input label="Phone" name="adminPhone" type="tel" required error={addFe.adminPhone} />
          {addState.status === "error" ? <FormError message={addState.message} /> : null}
          <div>
            <Button type="submit" loading={adding}>
              Add admin
            </Button>
          </div>
        </form>
        {addState.status === "success" ? (
          <Credentials email={addState.email} tempPassword={addState.tempPassword} />
        ) : null}
      </details>
    </section>
  );
}
