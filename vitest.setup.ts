// Adds jest-dom matchers (toBeInTheDocument, toHaveAttribute, …) to Vitest's
// expect, and augments the "vitest" types so test files see them.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Dummy public env so modules that read it at import time don't throw in tests.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";

afterEach(() => {
  cleanup();
});
