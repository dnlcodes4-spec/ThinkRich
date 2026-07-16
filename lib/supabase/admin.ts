import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role Supabase client — BYPASSES RLS. Server-only: only import this from
// a "use server" module (Server Actions) that enforces its own authorization.
// The key is read from a non-NEXT_PUBLIC env var, so it is never in the client
// bundle; the guard below fails loudly if it is missing on the server.
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for account provisioning. Add it to .env.local.",
    );
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
