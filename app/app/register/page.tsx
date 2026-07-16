import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RegisterMemberForm } from "./register-form";

export const metadata: Metadata = {
  title: "Register a member",
  robots: { index: false, follow: false },
};

// Leader-only. The proxy guarantees a session; RLS guarantees a non-leader can't
// actually insert. Geography is auto-loaded from the leader's own polling unit.
export default async function RegisterMemberPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role, state_id, lga_id, ward_id, polling_unit_id")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const isLeader =
    !!profile &&
    profile.role === "leader" &&
    !!profile.state_id &&
    !!profile.lga_id &&
    !!profile.ward_id &&
    !!profile.polling_unit_id;

  if (!isLeader) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Register a member
        </h1>
        <p className="text-sm text-muted">
          Only leaders can register members. Your account is not a leader account.
        </p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const [{ data: pu }, { data: ward }, { data: lga }, { data: state }] = await Promise.all([
    supabase.from("polling_units").select("name").eq("id", profile.polling_unit_id!).single(),
    supabase.from("wards").select("name").eq("id", profile.ward_id!).single(),
    supabase.from("lgas").select("name, code").eq("id", profile.lga_id!).single(),
    supabase.from("states").select("name, code").eq("id", profile.state_id!).single(),
  ]);

  const where = [state?.name, lga?.name, ward?.name, pu?.name].filter(Boolean).join(" › ");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Register a member
      </h1>
      <p className="mt-2 text-sm text-muted">
        Registering into your polling unit: <span className="font-medium text-foreground">{where}</span>.
        A membership number is issued automatically.
      </p>
      <div className="mt-8">
        <RegisterMemberForm />
      </div>
    </main>
  );
}
