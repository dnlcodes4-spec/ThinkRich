import { SkeletonHeader, SkeletonList, LoadingRegion } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <SkeletonHeader />
      <div className="mt-8">
        <LoadingRegion label="Loading the team">
          <SkeletonList rows={6} />
        </LoadingRegion>
      </div>
    </main>
  );
}
