"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { verifyKymCode, type VerifyState } from "./actions";

const initial: VerifyState = { status: "idle" };

export function VerifyForm() {
  const [state, action, pending] = useActionState(verifyKymCode, initial);

  return (
    <div>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <Input label="Leader code" name="code" placeholder="ABC-DEF-GHJ" autoComplete="off" required />
        </div>
        <Button type="submit" loading={pending}>
          Verify
        </Button>
      </form>

      {state.status === "found" && state.leader ? (
        <div className="mt-4 rounded-card border border-success/40 bg-success-soft p-4">
          <p className="text-sm font-semibold text-success">Verified leader</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{state.leader.name}</p>
          <p className="text-sm text-muted">
            <span className="capitalize">{state.leader.role}</span> · {state.leader.where}
          </p>
        </div>
      ) : null}

      {state.status === "notfound" ? (
        <div className="mt-4 rounded-card border border-danger/40 bg-danger-soft p-4">
          <p className="text-sm font-semibold text-danger">Not verified</p>
          <p className="mt-1 text-sm text-muted">No active leader matches that code.</p>
        </div>
      ) : null}
    </div>
  );
}
