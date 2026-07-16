import { randomBytes } from "node:crypto";

// A random temporary password handed to a freshly provisioned user, to be changed
// on first sign-in. 16 hex chars + a symbol/upper/digit so it clears any policy.
// Server-only: pulls in node:crypto.
export function generateTempPassword(): string {
  return randomBytes(8).toString("hex") + "!Aa9";
}
