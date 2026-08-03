import { SkeletonHeader, SkeletonForm, LoadingRegion } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <SkeletonHeader />
      <div className="mt-8">
        <LoadingRegion label="Loading">
          <SkeletonForm fields={2} />
        </LoadingRegion>
      </div>
    </main>
  );
}
