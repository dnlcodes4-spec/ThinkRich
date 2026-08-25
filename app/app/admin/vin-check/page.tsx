import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VinCheckForm } from "./vin-check-form";

export const metadata: Metadata = {
  title: "VIN write check",
  robots: { index: false, follow: false },
};

// THROWAWAY page verifying the voter_ids upsert -> insert fix (PR #81) against
// the live database. Not linked from any nav. Delete this directory once
// confirmed working.
export default async function VinCheckPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (!me || me.role === "member") {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-sm text-muted">Sign in with an admin or leadership account to use this check.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-lg font-semibold text-foreground">VIN write check</h1>
      <p className="mt-2 text-sm text-muted">
        Temporary tool to confirm the voter registration VIN fix. Enter a real VIN, Save it (this
        is the exact write a leader&apos;s registration makes), then Save again with the same VIN —
        that second save is the case that used to fail. Delete removes the test row afterward,
        provided nothing real points at it.
      </p>
      <VinCheckForm />
    </div>
  );
}
