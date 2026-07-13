import { z } from "zod";

// Public (client-safe) environment. NEXT_PUBLIC_* values are inlined by Next at
// build time, so this validates in both the browser and server bundles. It fails
// loudly with a clear message if a required variable is missing or malformed.
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function parsePublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
