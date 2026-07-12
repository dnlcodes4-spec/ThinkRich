import { cn } from "@/lib/cn";

export type Role = "national" | "state" | "lg" | "unit" | "leader" | "member";

const roleLabel: Record<Role, string> = {
  national: "National Admin",
  state: "State Admin",
  lg: "L.G Admin",
  unit: "Unit Coordinator",
  leader: "Leader",
  member: "Member",
};

/** Identifies the actor's role. Members read as neutral; every admin/leader as brand. */
export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-1 text-[11px] font-bold uppercase tracking-wide",
        role === "member"
          ? "bg-surface-muted text-muted"
          : "bg-primary text-primary-foreground",
        className,
      )}
    >
      {roleLabel[role]}
    </span>
  );
}
