import { cn } from "@/lib/cn";

/**
 * Placeholder block shown while server data is in flight. The pulse is wrapped
 * in `motion-safe:`, so it holds still for anyone who asked for reduced motion.
 *
 * Skeletons mirror the shape of the real content (a row is a row, a tile is a
 * tile) so the page does not jump when the data lands.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("motion-safe:animate-pulse rounded-md bg-surface-muted", className)}
      {...props}
    />
  );
}

/** Page heading + one line of supporting text. */
export function SkeletonHeader() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

/** A card-shaped block, used for tiles, list rows and stat cards. */
export function SkeletonCard({ className }: { className?: string }) {
  return <Skeleton className={cn("h-24 rounded-card", className)} />;
}

/**
 * Wrapper that announces loading to assistive tech. The visual skeleton itself
 * is aria-hidden, so a screen reader hears one clear message instead of a pile
 * of empty boxes.
 */
export function LoadingRegion({
  label = "Loading",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
