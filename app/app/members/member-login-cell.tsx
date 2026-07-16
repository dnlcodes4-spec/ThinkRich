"use client";

import { useActionState } from "react";
import { provisionMemberLoginAction, type ProvisionState } from "./provision-login";

const initial: ProvisionState = { status: "idle" };

// Per-row login control on the roster. Shows whether the member has a login;
// for those without one (but with an email), offers to provision it and reveals
// the one-time temporary password inline.
export function MemberLoginCell({
  id,
  hasLogin,
  hasEmail,
}: {
  id: string;
  hasLogin: boolean;
  hasEmail: boolean;
}) {
  const [state, action, pending] = useActionState(provisionMemberLoginAction, initial);

  if (hasLogin) {
    return <span className="text-xs font-medium text-muted">Enabled</span>;
  }

  if (state.status === "success") {
    return (
      <span className="flex flex-col gap-0.5 text-xs">
        <span className="text-muted">Temp password</span>
        <span className="font-mono font-bold break-all text-foreground">{state.tempPassword}</span>
      </span>
    );
  }

  if (!hasEmail) {
    return <span className="text-xs text-muted">No email</span>;
  }

  return (
    <form action={action}>
      <input type="hidden" name="member_id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-8 rounded-md border border-ring px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60"
      >
        {pending ? "Creating…" : "Provision login"}
      </button>
      {state.status === "error" && state.message ? (
        <p className="mt-1 text-xs text-danger">{state.message}</p>
      ) : null}
    </form>
  );
}
