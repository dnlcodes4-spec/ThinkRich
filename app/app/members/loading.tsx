import { LoadingRegion, Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

// Roster shape: heading, search bar, then rows. Matches the real page so the
// layout does not shift when the members arrive.
export default function MembersLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <LoadingRegion label="Loading members">
        <SkeletonHeader />
        <Skeleton className="mt-6 h-11 w-full" />
        <div className="mt-8 flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-card" />
          ))}
        </div>
      </LoadingRegion>
    </main>
  );
}
