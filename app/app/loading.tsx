import { LoadingRegion, Skeleton, SkeletonCard, SkeletonHeader } from "@/components/ui/skeleton";

// Fallback loading state for any /app/* route without its own. The shell (nav +
// header) is part of the layout, so it stays put and only the content swaps.
export default function AppLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <LoadingRegion label="Loading this page">
        <SkeletonHeader />
        <div className="mt-8 flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <Skeleton className="h-4 w-40" />
        </div>
      </LoadingRegion>
    </main>
  );
}
