import { SkeletonHeader, SkeletonList, LoadingRegion } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="app-fade-in mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <SkeletonHeader />
      <div className="mt-8">
        <LoadingRegion label="Loading candidates">
          <SkeletonList rows={5} />
        </LoadingRegion>
      </div>
    </main>
  );
}
