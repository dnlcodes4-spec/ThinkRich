"use client";

import { useActionState } from "react";
import {
  provisionMemberLoginAction,
  resetMemberLoginPasswordAction,
  type ProvisionState,
} from "./provision-login";

const initial: ProvisionState = { status: "idle" };

// Per-row login control on the roster. For a member without a login (but with an
// email) it provisions one; for a member who already has a login it can reset the
// password. Either way the one-time temporary password is revealed inline (it is
// shown once and never stored, so a reset is the only way to recover a missed one).
export function MemberLoginCell({
  id,
  hasLogin,
  hasEmail,
}: {
  id: string;
  hasLogin: boolean;
  hasEmail: boolean;
}) {
  const [provState, provAction, provPending] = useActionState(provisionMemberLoginAction, initial);
  const [resetState, resetAction, resetPending] = useActionState(
    resetMemberLoginPasswordAction,
    initial,
  );

  if (hasLogin) {
    if (resetState.status === "success") {
      return <TempPassword value={resetState.tempPassword} label="New temp password" />;
    }
    return (
      <form action={resetAction} className="flex flex-col items-start gap-1">
        <input type="hidden" name="member_id" value={id} />
        <span className="text-xs font-medium text-muted">Enabled</span>
        <button
          type="submit"
          disabled={resetPending}
          className="text-xs font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-60"
        >
          {resetPending ? "Resetting…" : "Reset password"}
        </button>
        {resetState.status === "error" && resetState.message ? (
          <span className="text-xs text-danger">{resetState.message}</span>
        ) : null}
      </form>
    );
  }

  if (provState.status === "success") {
    return <TempPassword value={provState.tempPassword} label="Temp password" />;
  }

  if (!hasEmail) {
    return <span className="text-xs text-muted">No email</span>;
  }

  return (
    <form action={provAction}>
      <input type="hidden" name="member_id" value={id} />
      <button
        type="submit"
        disabled={provPending}
        className="min-h-8 rounded-md border border-ring px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60"
      >
        {provPending ? "Creating…" : "Provision login"}
      </button>
      {provState.status === "error" && provState.message ? (
        <p className="mt-1 text-xs text-danger">{provState.message}</p>
      ) : null}
    </form>
  );
}

function TempPassword({ value, label }: { value?: string; label: string }) {
  return (
    <span className="flex flex-col gap-0.5 text-xs">
      <span className="text-muted">{label}</span>
      <span className="font-mono font-bold break-all text-foreground">{value}</span>
      <span className="text-muted">Shown once. Give it to the member.</span>
    </span>
  );
}
