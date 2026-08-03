import { SkeletonHeader, SkeletonForm, LoadingRegion } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <SkeletonHeader />
      <div className="mt-8">
        <LoadingRegion label="Loading notifications">
          <SkeletonForm fields={3} />
        </LoadingRegion>
      </div>
    </main>
  );
}
