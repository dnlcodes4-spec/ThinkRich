import { cn } from "@/lib/cn";

export type MemberStatus =
  | "active"
  | "frozen"
  | "deleted"
  | "pending"
  | "approved"
  | "rejected";

// Colour is never the only signal — every pill pairs the tint with a dot + text.
const config: Record<MemberStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "text-success bg-success-soft border-success/30" },
  approved: { label: "Approved", className: "text-success bg-success-soft border-success/30" },
  frozen: { label: "Paused", className: "text-warning bg-warning-soft border-warning/30" },
  pending: { label: "Pending", className: "text-warning bg-warning-soft border-warning/30" },
  rejected: { label: "Declined", className: "text-danger bg-danger-soft border-danger/30" },
  deleted: { label: "Removed", className: "text-muted bg-surface-muted border-border" },
};

export function StatusPill({
  status,
  className,
}: {
  status: MemberStatus;
  className?: string;
}) {
  const { label, className: statusClassName } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
        statusClassName,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
