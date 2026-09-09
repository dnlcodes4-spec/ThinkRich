"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { VinInput } from "@/components/ui/vin-input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { NATIONWIDE_LABEL, PARTNER_KIND_LABELS, PARTNER_KINDS } from "@/lib/partners";
import { onboardPartner, type OnboardPartnerResult } from "./actions";

// The action's result has no "idle" member, so the starting state is an error
// with no message: FormError renders nothing until a submit actually fails.
const initial: OnboardPartnerResult = { status: "error" };

type State = { id: string; name: string };

type Prefill = {
  requestId: string;
  name: string;
  adminFullName: string;
  adminEmail: string;
  adminPhone: string;
};

// The action takes a plain object rather than FormData (it is called directly
// from tests too), so this form maps the fields across before calling it.
export function PartnerForm({ states, prefill }: { states: State[]; prefill?: Prefill }) {
  const [instance, setInstance] = useState(0);
  return (
    <Inner
      key={instance}
      states={states}
      prefill={prefill}
      onReset={() => setInstance((i) => i + 1)}
    />
  );
}

function Inner({
  states,
  prefill,
  onReset,
}: {
  states: State[];
  prefill?: Prefill;
  onReset: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: OnboardPartnerResult, formData: FormData) => {
      const value = (key: string) => String(formData.get(key) ?? "");
      const scope = value("scopeStateId");
      return onboardPartner({
        name: value("name"),
        kind: value("kind"),
        scopeStateId: scope === "" ? null : scope,
        code: value("code"),
        adminFullName: value("adminFullName"),
        adminEmail: value("adminEmail"),
        adminVin: value("vin"),
        adminPhone: value("adminPhone"),
        requestId: prefill?.requestId ?? null,
      });
    },
    initial,
  );
  const fe = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <div className="rounded-card border border-border bg-surface p-6">
        <p className="text-sm font-semibold text-foreground">Partner onboarded</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Admin email</dt>
          <dd className="font-medium break-all">{state.email}</dd>
          <dt className="text-muted">Temp password</dt>
          <dd className="font-mono font-bold">{state.tempPassword}</dd>
        </dl>
        <p className="mt-4 rounded-md bg-surface-muted p-3 text-xs text-muted">
          Share these credentials with the partner&apos;s first admin. Ask them to change the
          password after their first sign-in. This password will not be shown again.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Button onClick={onReset}>Onboard another</Button>
          {state.partnerId ? (
            <Link
              href={`/app/admin/partners/${state.partnerId}`}
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Open this partner
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-8">
      <section className="flex flex-col gap-5">
        <h2 className="font-display text-lg font-semibold text-foreground">The organisation</h2>

        <Input
          label="Organisation name"
          name="name"
          required
          error={fe.name}
          defaultValue={prefill?.name}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-foreground">Kind</legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            {PARTNER_KINDS.map((k, i) => (
              <label
                key={k}
                className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 rounded-sm border border-border bg-surface px-3 text-base text-foreground focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ring"
              >
                <input type="radio" name="kind" value={k} defaultChecked={i === 0} className="size-4" />
                {PARTNER_KIND_LABELS[k]}
              </label>
            ))}
          </div>
          {fe.kind ? <p className="text-xs text-danger">{fe.kind}</p> : null}
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-foreground">Ceiling</span>
          <select
            name="scopeStateId"
            defaultValue=""
            className="min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          >
            <option value="">{NATIONWIDE_LABEL}</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">
            The furthest this partner may reach. Nationwide leaves it uncapped.
          </span>
          {fe.scopeStateId ? <p className="text-xs text-danger">{fe.scopeStateId}</p> : null}
        </label>

        <Input
          label="Code"
          name="code"
          required
          hint="2 to 6 letters or digits. It prefixes every membership number this partner issues, and cannot change later."
          error={fe.code}
          className="font-mono uppercase"
        />
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="font-display text-lg font-semibold text-foreground">Their first admin</h2>
        <p className="text-sm text-muted">
          This person runs the partner&apos;s side of the platform. They get a temporary password to
          sign in with.
        </p>

        <Input
          label="Full name"
          name="adminFullName"
          autoComplete="name"
          required
          error={fe.adminFullName}
          defaultValue={prefill?.adminFullName}
        />
        <Input
          label="Email"
          name="adminEmail"
          type="email"
          autoComplete="off"
          required
          error={fe.adminEmail}
          defaultValue={prefill?.adminEmail}
        />
        <Input
          label="Phone number"
          name="adminPhone"
          type="tel"
          autoComplete="tel"
          required
          hint="Nigerian mobile, e.g. 0803 123 4567."
          error={fe.adminPhone}
          defaultValue={prefill?.adminPhone}
        />
        <VinInput label="Their voter's card number (VIN)" error={fe.adminVin} />
      </section>

      <FormError message={state.status === "error" ? state.message : undefined} />

      <Button type="submit" loading={pending} className="sm:self-start">
        Onboard partner
      </Button>
    </form>
  );
}
