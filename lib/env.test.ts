import { describe, it, expect } from "vitest";
import { publicEnvSchema } from "./env";

describe("publicEnvSchema", () => {
  it("accepts a valid URL and non-empty anon key", () => {
    const result = publicEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-URL Supabase URL", () => {
    const result = publicEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty anon key", () => {
    const result = publicEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    });
    expect(result.success).toBe(false);
  });
});
