"use client";

import { useActionState } from "react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { PARTNER_KIND_LABELS } from "@/lib/partners";
import { moveMember, type MoveState } from "./move-actions";

const initial: MoveState = { status: "idle" };

type PartnerOption = { id: string; name: string; kind: "political" | "community" };

// Super-admin only. Moves this voter into another organisation (or the core
// movement), reissuing their membership number there. The work and the audit
// row live in the move_member_to_partition RPC (migration 0056).
export function MoveMember({
  memberId,
  currentPartnerId,
  partners,
}: {
  memberId: string;
  currentPartnerId: string | null;
  partners: PartnerOption[];
}) {
  const [state, action, pending] = useActionState(moveMember, initial);

  const destinations = partners.filter((p) => p.id !== currentPartnerId);
  // Nowhere to move to (no other active partner, and already core).
  if (destinations.length === 0 && currentPartnerId === null) return null;

  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="text-sm font-semibold text-foreground">Move to another organisation</h2>
      <details className="mt-4 rounded-card border border-border bg-surface-muted p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          Move this voter
        </summary>
        <form action={action} className="mt-4 grid gap-4 sm:max-w-md">
          <input type="hidden" name="member_id" value={memberId} />
          <Select label="Destination" name="target" defaultValue="">
            <option value="" disabled>
              Choose an organisation
            </option>
            {currentPartnerId !== null ? <option value="core">The core movement</option> : null}
            {destinations.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({PARTNER_KIND_LABELS[p.kind]})
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted">
            A new membership number is issued in the chosen organisation. The voter&apos;s digital
            card updates on its own; a printed card becomes out of date. Their sign-in is not
            affected.
          </p>
          {state.status === "error" ? <FormError message={state.message} /> : null}
          {state.status === "success" ? (
            <p className="text-sm font-medium text-success">
              Moved. New membership number: <span className="font-mono">{state.newNumber}</span>
            </p>
          ) : null}
          <div>
            <Button type="submit" variant="secondary" loading={pending}>
              Move voter
            </Button>
          </div>
        </form>
      </details>
    </section>
  );
}
