// Adds jest-dom matchers (toBeInTheDocument, toHaveAttribute, …) to Vitest's
// expect, and augments the "vitest" types so test files see them.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
