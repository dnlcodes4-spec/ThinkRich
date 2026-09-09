import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Shown when a NIN or VIN is already registered, but in a different partition
// (the core movement, or another partner). CR-0026 keeps one person to exactly
// one world; moving them is a super-admin action.
export const IDENTITY_TAKEN_ELSEWHERE =
  "This person is already registered under another organisation or the core movement. They must be moved before they can be registered here.";

type Client = SupabaseClient<Database>;

// Ask the database, across every partition, whether this NIN or VIN is free.
// `identity_registration_status` is SECURITY DEFINER so it sees past the partner
// wall, but only ever returns the coarse bucket, never which world. It returns
// "unknown" for a plain member caller (it is not an existence oracle for
// rank-and-file logins) and on any error; callers fall back to their generic
// "already registered" copy in that case.
export async function identityRegistrationStatus(
  supabase: Client,
  { nin, vin }: { nin?: string | null; vin?: string | null },
): Promise<"available" | "taken_here" | "taken_elsewhere" | "unknown"> {
  const args: { p_nin?: string; p_vin?: string } = {};
  if (nin) args.p_nin = nin;
  if (vin) args.p_vin = vin;
  const { data, error } = await supabase.rpc("identity_registration_status", args);
  if (error || data == null) return "unknown";
  return data as "available" | "taken_here" | "taken_elsewhere";
}
