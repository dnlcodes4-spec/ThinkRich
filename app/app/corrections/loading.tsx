import { LoadingRegion, Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

// Review-queue shape: heading, then a few request cards (each taller than a
// roster row, since it carries the field, value, reason and actions).
export default function CorrectionsLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <LoadingRegion label="Loading correction requests">
        <SkeletonHeader />
        <div className="mt-8 flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-card" />
          ))}
        </div>
      </LoadingRegion>
    </main>
  );
}
