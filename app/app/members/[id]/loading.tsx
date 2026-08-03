import { SkeletonHeader, SkeletonCard, SkeletonList, LoadingRegion } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <SkeletonHeader />
      <div className="mt-8">
        <LoadingRegion label="Loading member details">
          <div className="flex flex-col gap-4">
            <SkeletonCard className="h-32" />
            <SkeletonList rows={4} />
          </div>
        </LoadingRegion>
      </div>
    </main>
  );
}
