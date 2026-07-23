import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { generateMyKymCode } from "./actions";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = {
  title: "Verify a leader",
  robots: { index: false, follow: false },
};

// KYM (T-010): a leader shares their code so other leaders can confirm they are
// real, and verifies others by entering a code.
export default async function KymPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (!me || me.role === "member") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Verify a leader</h1>
        <p className="text-sm text-muted">This is for leaders.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const { data: mine } = await supabase
    .from("leader_kym_codes")
    .select("code")
    .eq("leader_id", user!.id)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Verify a leader</h1>
      <p className="mt-1 text-sm text-muted">Confirm another leader is genuine, or share your own code.</p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Your code</h2>
        {mine ? (
          <div className="mt-3 rounded-card border border-border bg-surface p-5">
            <p className="font-mono text-2xl font-bold tracking-widest text-foreground">{mine.code}</p>
            <p className="mt-2 text-sm text-muted">
              Share this with another leader so they can verify you. It never expires.
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-card border border-dashed border-border p-5">
            <p className="text-sm text-muted">You don&rsquo;t have a code yet.</p>
            <form action={generateMyKymCode} className="mt-3">
              <Button type="submit">Generate my code</Button>
            </form>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Check a leader&rsquo;s code</h2>
        <VerifyForm />
      </section>
    </main>
  );
}
