import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { StatusPill, type MemberStatus } from "./status-pill";

type RecordCardProps = {
  name: string;
  /** Key identifier, e.g. membership number — rendered in tabular mono. */
  identifier: string;
  /** 1–2 supporting facts (e.g. "Ikeja · Lagos"). */
  facts?: string;
  status?: MemberStatus;
  /** Action row — keep to one primary CTA + an overflow. */
  actions?: ReactNode;
  className?: string;
};

/**
 * The mobile counterpart to a table row: identity + status lead, the key
 * identifier in mono, a couple of supporting facts, and one primary action.
 * See docs/design/responsive-and-dashboards.md.
 */
export function RecordCard({
  name,
  identifier,
  facts,
  status,
  actions,
  className,
}: RecordCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-card border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-bold">{name}</div>
          <div className="font-mono text-sm text-muted">{identifier}</div>
        </div>
        {status && <StatusPill status={status} />}
      </div>
      {facts && <div className="text-sm text-muted">{facts}</div>}
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
