import { SkeletonHeader, SkeletonForm, LoadingRegion } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <SkeletonHeader />
      <div className="mt-8">
        <LoadingRegion label="Loading your account">
          <SkeletonForm fields={4} />
        </LoadingRegion>
      </div>
    </main>
  );
}
