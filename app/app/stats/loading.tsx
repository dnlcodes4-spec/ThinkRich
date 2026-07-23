import { LoadingRegion, Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

// Statistics shape: heading, the KPI tile row, then the breakdown bars.
export default function StatsLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <LoadingRegion label="Loading statistics">
        <SkeletonHeader />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2.5">
          <Skeleton className="h-4 w-36" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-2.5 w-full rounded-full" />
          ))}
        </div>
      </LoadingRegion>
    </main>
  );
}
