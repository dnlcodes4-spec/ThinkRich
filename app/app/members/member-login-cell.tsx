"use client";

import { useActionState } from "react";
import {
  addMemberEmailAction,
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
  const [emailState, emailAction, emailPending] = useActionState(addMemberEmailAction, initial);

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

  // A member registered before CR-0025 may have no email. Let a leader/admin add
  // one inline; the server action also provisions the login and returns the
  // one-time temp password.
  if (!hasEmail) {
    if (emailState.status === "success") {
      return emailState.tempPassword ? (
        <TempPassword value={emailState.tempPassword} label="Temp password" />
      ) : (
        <span className="text-xs text-muted">{emailState.message ?? "Email saved."}</span>
      );
    }
    return (
      <form action={emailAction} className="flex flex-col items-start gap-1">
        <input type="hidden" name="member_id" value={id} />
        <span className="text-xs font-medium text-muted">No email</span>
        <span className="flex flex-wrap items-center gap-1">
          <input
            type="email"
            name="email"
            required
            aria-label="Voter email"
            placeholder="name@example.com"
            className="min-h-8 w-44 rounded-md border border-border bg-surface px-2 text-xs text-foreground placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          />
          <button
            type="submit"
            disabled={emailPending}
            className="min-h-8 rounded-md border border-ring px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60"
          >
            {emailPending ? "Saving…" : "Add & provision"}
          </button>
        </span>
        {emailState.status === "error" && emailState.message ? (
          <span className="text-xs text-danger">{emailState.message}</span>
        ) : null}
      </form>
    );
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
