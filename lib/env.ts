import { z } from "zod";

// Public (client-safe) environment. NEXT_PUBLIC_* values are inlined by Next at
// build time, so this validates in both the browser and server bundles. It fails
// loudly with a clear message if a required variable is missing or malformed.
// A bare hostname: no scheme, no path, no port. `thinkrichcommunity.com`, not
// `https://thinkrichcommunity.com/`. The proxy compares it against the Host
// header, which carries exactly this shape.
const hostname = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i,
    "must be a bare hostname such as thinkrichcommunity.com (no scheme, port, or trailing slash)",
  );

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Two-origin split (CR-0008, ADR-0014). BOTH must be set to enable it. When
  // either is absent the split is off and every surface is served from a single
  // origin, which is what local dev and Vercel preview deployments need — they
  // have no subdomain to split across. Unsetting them in Vercel is also the
  // documented rollback.
  NEXT_PUBLIC_APEX_HOST: hostname.optional(),
  NEXT_PUBLIC_THINK_WINNERS_HOST: hostname.optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function parsePublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // Referenced literally, not via a computed key: Next inlines NEXT_PUBLIC_*
    // at build time only where it can see the property access in source.
    NEXT_PUBLIC_APEX_HOST: process.env.NEXT_PUBLIC_APEX_HOST,
    NEXT_PUBLIC_THINK_WINNERS_HOST: process.env.NEXT_PUBLIC_THINK_WINNERS_HOST,
  });
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing public environment variables:\n${details}\n` +
        "See .env.example and set them in .env.local.",
    );
  }
  return parsed.data;
}

export const env = parsePublicEnv();
