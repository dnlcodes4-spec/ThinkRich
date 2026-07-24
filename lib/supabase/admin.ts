import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role Supabase client. BYPASSES RLS. Server-only: only import this from
// a "use server" module (Server Actions) or a server component that enforces its
// own authorization. The key is read from a non-NEXT_PUBLIC env var, so it is
// never in the client bundle.
//
// When the key is missing (a deploy that forgot the env var), a raw throw shows
// up as an opaque 500 with a digest, which tells an operator nothing. So callers
// get three options: check `isAdminConfigured()`, take the nullable
// `tryCreateAdminClient()` and degrade, or call `createAdminClient()` and let it
// throw with a message that names the actual problem.

/** User-facing copy for a deploy that is missing the service-role key. */
export const ADMIN_NOT_CONFIGURED =
  "Provisioning isn't configured on this deployment. Ask an administrator to set SUPABASE_SERVICE_ROLE_KEY, then redeploy.";

export function isAdminConfigured(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function build(serviceKey: string) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Service-role client, or `null` when the key is not set. Use this where the
 * surface can still render something useful without it (an optional photo, a
 * readable notice) instead of crashing the whole route.
 */
export function tryCreateAdminClient(): ReturnType<typeof build> | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return serviceKey ? build(serviceKey) : null;
}

/**
 * Service-role client. Throws when the key is missing, carrying the same
 * readable message shown to users, so server logs name the misconfiguration.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error(ADMIN_NOT_CONFIGURED);
  return build(serviceKey);
}
