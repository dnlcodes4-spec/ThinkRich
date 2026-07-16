"use client";

import { useState } from "react";
import type { MemberStatus } from "@/components/ui/status-pill";
import { reactivateMember, deleteMember } from "./lifecycle-actions";

// Lifecycle actions for a FROZEN member on the roster: reactivate any time, or
// permanently delete once the retention window has elapsed. Delete is a
// two-step confirm with the consequence named. Reactivate/delete are plain
// form actions (they revalidate the roster on the server).
export function MemberLifecycleCell({
  id,
  status,
  retentionUntil,
}: {
  id: string;
  status: MemberStatus;
  retentionUntil: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  if (status !== "frozen") return null;

  const canDelete = retentionUntil ? new Date(retentionUntil) <= new Date() : false;
  const until = retentionUntil
    ? new Date(retentionUntil).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })
    : null;

  if (confirming) {
    return (
      <div className="flex flex-col gap-1.5 text-xs">
        <span className="text-danger">Delete permanently? Their details are erased.</span>
        <div className="flex gap-2">
          <form action={deleteMember}>
            <input type="hidden" name="member_id" value={id} />
            <button
              type="submit"
              className="min-h-8 rounded-md border border-danger/50 px-2.5 font-semibold text-danger transition-colors hover:bg-danger-soft"
            >
              Delete
            </button>
          </form>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-8 rounded-md border border-ring px-2.5 font-semibold text-foreground transition-colors hover:bg-surface-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <form action={reactivateMember}>
        <input type="hidden" name="member_id" value={id} />
        <button
          type="submit"
          className="min-h-8 rounded-md border border-ring px-2.5 font-semibold text-foreground transition-colors hover:bg-surface-muted"
        >
          Reactivate
        </button>
      </form>
      {canDelete ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-8 rounded-md border border-danger/50 px-2.5 font-semibold text-danger transition-colors hover:bg-danger-soft"
        >
          Delete
        </button>
      ) : (
        <span className="text-muted">Deletable {until}</span>
      )}
    </div>
  );
}
