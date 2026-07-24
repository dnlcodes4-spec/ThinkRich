import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { NotConfigured } from "@/components/ui/not-configured";
import { CANDIDATE_SCOPE, LEVEL_LABEL, CANDIDATE_PHOTOS_BUCKET, type Role } from "./scope";
import { CandidateForm } from "./candidate-form";

export const metadata: Metadata = {
  title: "Manage candidate",
  robots: { index: false, follow: false },
};

// An admin manages the one candidate for their scope (national -> presidential,
// state admin -> their state, LG admin -> their LGA). The Server Action re-checks
// this; the page just shows the right form.
export default async function ManageCandidatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role, state_id, lga_id").eq("id", user.id).maybeSingle()
    : { data: null };
  const scope = profile ? CANDIDATE_SCOPE[profile.role as Role] : undefined;

  if (!profile || !scope) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Manage candidate</h1>
        <p className="text-sm text-muted">Your role does not manage candidates.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const admin = tryCreateAdminClient();
  if (!admin) return <NotConfigured title="Manage candidate" />;

  let q = admin.from("candidates").select("*").eq("level", scope.level);
  q = scope.geo === "state" ? q.eq("state_id", profile.state_id!) : scope.geo === "lga" ? q.eq("lga_id", profile.lga_id!) : q.is("state_id", null);
  const { data: existing } = await q.maybeSingle();

  // Scope label for the heading.
  let where = "Nigeria";
  if (scope.geo === "state" && profile.state_id) {
    const { data: st } = await supabase.from("states").select("name").eq("id", profile.state_id).maybeSingle();
    where = st?.name ?? "your state";
  } else if (scope.geo === "lga" && profile.lga_id) {
    const { data: lg } = await supabase.from("lgas").select("name, state_id").eq("id", profile.lga_id).maybeSingle();
    const { data: st } = lg ? await supabase.from("states").select("name").eq("id", lg.state_id).maybeSingle() : { data: null };
    where = [st?.name, lg?.name].filter(Boolean).join(" › ") || "your LGA";
  }

  const photoUrl = existing?.photo_url
    ? admin.storage.from(CANDIDATE_PHOTOS_BUCKET).getPublicUrl(existing.photo_url).data.publicUrl
    : null;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        {LEVEL_LABEL[scope.level]}
      </h1>
      <p className="mt-1 text-sm text-muted">
        For <span className="font-medium text-foreground">{where}</span>. Members here see this on
        their voting screen.
      </p>

      <div className="mt-8">
        <CandidateForm
          defaults={{
            exists: !!existing,
            full_name: existing?.full_name ?? "",
            party: existing?.party ?? "",
            running_mate: existing?.running_mate ?? "",
            slogan: existing?.slogan ?? "",
          }}
          photoUrl={photoUrl}
        />
      </div>
    </main>
  );
}
