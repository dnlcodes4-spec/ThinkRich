import { SkeletonHeader, SkeletonList, LoadingRegion } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <SkeletonHeader />
      <div className="mt-8">
        <LoadingRegion label="Loading states">
          <SkeletonList rows={8} />
        </LoadingRegion>
      </div>
    </main>
  );
}
