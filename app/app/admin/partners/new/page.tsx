import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { NotConfigured } from "@/components/ui/not-configured";
import { PartnerForm } from "./partner-form";

export const metadata: Metadata = {
  title: "Onboard a partner",
  robots: { index: false, follow: false },
};

// Two things happen on submit: the `partners` row, and the first partner_admin
// who runs it. The Server Action re-checks the super_admin rule, because half of
// the work uses the service role and so bypasses RLS.
export default async function NewPartnerPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>;
}) {
  const { request: requestId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (me?.role !== "super_admin") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Onboard a partner
        </h1>
        <p className="text-sm text-muted">This area is for the super admin.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const admin = tryCreateAdminClient();
  if (!admin) return <NotConfigured title="Onboard a partner" />;

  const { data: states } = await admin
    .from("states")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  // Prefill from a partnership request, if the super admin came from that queue.
  const uuid = /^[0-9a-f-]{36}$/i;
  const { data: fromRequest } =
    requestId && uuid.test(requestId)
      ? await supabase
          .from("partnership_requests")
          .select("id, name, organization, email, phone")
          .eq("id", requestId)
          .maybeSingle()
      : { data: null };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link
        href="/app/admin/partners"
        className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        Back to partners
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground">
        Onboard a partner
      </h1>
      <p className="mt-2 text-sm text-muted">
        A partner organisation brings its own people in under its own code, capped at one state or
        left nationwide. Onboarding creates the organisation and the account for the person who
        will run it.
      </p>

      {fromRequest ? (
        <p className="mt-4 rounded-card border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
          Prefilled from {fromRequest.name}&apos;s request for {fromRequest.organization}. The request
          is marked onboarded once this succeeds.
        </p>
      ) : null}

      <section className="mt-8">
        <PartnerForm
          states={states ?? []}
          prefill={
            fromRequest
              ? {
                  requestId: fromRequest.id,
                  name: fromRequest.organization,
                  adminFullName: fromRequest.name,
                  adminEmail: fromRequest.email,
                  adminPhone: fromRequest.phone ?? "",
                }
              : undefined
          }
        />
      </section>
    </main>
  );
}
