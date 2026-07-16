import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CandidateCard } from "./candidate-card";

export const metadata: Metadata = {
  title: "Who to vote for",
  robots: { index: false, follow: false },
};

// The member's hero screen: the candidates for their own geography. Their LGA
// chairman is the hero (most local); then their governor and the presidential
// candidate. Candidates are world-readable to signed-in users (RLS); the app
// shows only the ones relevant to this member.
export default async function VotePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = user
    ? await supabase.from("members").select("state_id, lga_id").eq("user_id", user.id).maybeSingle()
    : { data: null };

  if (!member) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Who to vote for</h1>
        <p className="text-sm text-muted">This area is for members.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const [presRes, stateRes, lgRes, stateName, lgaName] = await Promise.all([
    supabase.from("candidates").select("*").eq("level", "presidential").maybeSingle(),
    supabase.from("candidates").select("*").eq("level", "state").eq("state_id", member.state_id).maybeSingle(),
    supabase.from("candidates").select("*").eq("level", "lg").eq("lga_id", member.lga_id).maybeSingle(),
    supabase.from("states").select("name").eq("id", member.state_id).maybeSingle(),
    supabase.from("lgas").select("name").eq("id", member.lga_id).maybeSingle(),
  ]);

  const pub = (path: string | null) =>
    path ? supabase.storage.from("candidate-photos").getPublicUrl(path).data.publicUrl : null;

  const toCard = (c: (typeof presRes)["data"]) =>
    c
      ? {
          full_name: c.full_name,
          party: c.party,
          running_mate: c.running_mate,
          slogan: c.slogan,
          photoUrl: pub(c.photo_url),
        }
      : null;

  const state = stateName.data?.name ?? "your state";
  const lga = lgaName.data?.name ?? "your LGA";

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Who to vote for</h1>
      <p className="mt-1 text-sm text-muted">The movement&rsquo;s candidates for {lga}, {state}.</p>

      <div className="mt-8 flex flex-col gap-4">
        <CandidateCard office="Your LGA chairman" where={lga} candidate={toCard(lgRes.data)} hero />
        <CandidateCard office="Governor" where={state} candidate={toCard(stateRes.data)} />
        <CandidateCard office="President" where="Nigeria" candidate={toCard(presRes.data)} />
      </div>
    </main>
  );
}
