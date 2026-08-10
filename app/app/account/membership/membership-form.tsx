"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { VinInput } from "@/components/ui/vin-input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { completeMyMembership, type MembershipState } from "../membership-actions";

const initial: MembershipState = { status: "idle" };

export type MembershipFormProps = {
  /** The caller's chosen home polling unit (resolved on the page). */
  pollingUnitId: string;
  /** Pre-fill their name from the profile; they can correct it. */
  defaultFullName: string;
  /** When the profile already has a VIN, reuse it: show it read-only. */
  hasVin: boolean;
  /** The VIN already on the profile, shown read-only when hasVin. */
  vin: string;
};

export function MembershipForm({ pollingUnitId, defaultFullName, hasVin, vin }: MembershipFormProps) {
  const [state, action, pending] = useActionState(completeMyMembership, initial);
  const fe = state.fieldErrors ?? {};
  // Artifact form: the success view below is the confirmation, so no toast.
  const error = state.status === "error" ? state.message : undefined;

  if (state.status === "success" && state.membershipNumber) {
    return (
      <div className="rounded-card border border-border bg-surface p-6">
        <div className="text-center">
          <p className="text-sm text-muted">You&apos;re a member. Your membership number:</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-foreground">
            {state.membershipNumber}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {state.memberId ? (
            <a
              href={`/app/members/${state.memberId}/card`}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Download your card
            </a>
          ) : null}
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
          >
            Go to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-8">
      <input type="hidden" name="polling_unit_id" value={pollingUnitId} />

      <fieldset className="min-w-0 border-0 p-0">
        <legend className="mb-4 text-sm font-semibold text-foreground">Your details</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Full name"
            name="full_name"
            autoComplete="name"
            defaultValue={defaultFullName}
            required
            error={fe.full_name}
          />
          <Input
            label="Phone number"
            name="phone"
            type="tel"
            autoComplete="tel"
            hint="Optional. Nigerian mobile, e.g. 0803 123 4567."
            error={fe.phone}
          />
          <Input
            label="Date of birth"
            name="date_of_birth"
            type="date"
            required
            hint="Must be 18 or older."
            error={fe.date_of_birth}
          />
          <Input label="NIN" name="nin" required hint="National ID number" error={fe.nin} />
          {hasVin ? (
            <Input
              label="Voter's card number (VIN)"
              name="vin_display"
              defaultValue={vin}
              readOnly
              hint="On file from your account."
              className="bg-surface-muted"
            />
          ) : (
            <VinInput error={fe.vin} />
          )}
          <Select label="Gender" name="gender" required defaultValue="" error={fe.gender}>
            <option value="" disabled>
              Select&hellip;
            </option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
        </div>
      </fieldset>

      <FormError message={error} />

      <Button type="submit" loading={pending} className="sm:self-start">
        Complete membership
      </Button>
    </form>
  );
}
