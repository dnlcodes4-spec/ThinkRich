# Security Policy

Security is a first-class concern on this platform because it stores **personal data of
members** (names, contact details, geographic scope) and enforces a **hierarchical
authorization model**. The full model is documented in
[docs/architecture/security-model.md](docs/architecture/security-model.md).

## Reporting a vulnerability

Do **not** open a public issue for security vulnerabilities. Instead, report privately to
the maintainer (see [CODEOWNERS](.github/CODEOWNERS)). Include:

- A description of the issue and its impact
- Steps to reproduce (proof of concept if possible)
- Affected component(s) and any suggested remediation

We aim to acknowledge within 48 hours and provide a remediation timeline after triage.

## Security principles for contributors

1. **Authorization lives in the database.** Supabase **Row-Level Security (RLS)** is the
   authoritative access boundary — the UI only mirrors it. Never rely on hiding a button as
   a security control. See [ADR-0005](docs/architecture/decisions/0005-rls-as-authorization-boundary.md).
2. **Never expose the service-role key to the client.** `SUPABASE_SERVICE_ROLE_KEY` is
   server-only. Only `NEXT_PUBLIC_*` values may reach the browser.
3. **Secrets never enter git.** Use `.env.local` (git-ignored). `.env.example` documents the
   required variables with placeholder values only.
4. **Validate all input server-side.** Every Server Action validates with Zod before touching
   the database, regardless of client-side checks.
5. **Least privilege.** A leader sees only their ≤10 members; a state admin only their state.
   Grant the narrowest scope that satisfies the requirement.
6. **Immutable identifiers.** Membership numbers are never mutable after issue.
7. **Security headers** are enforced in `next.config.ts` (CSP, `X-Frame-Options`,
   `X-Content-Type-Options`, `Referrer-Policy`), with a strict policy for the service worker.

## Data handling

- Personal data is collected only for membership administration and voting guidance.
- Opt-out permanently deletes member data after the retention step (see the app spec).
- Access to production data is logged; admin actions are auditable (activity logs).

## Dependencies

- Keep dependencies current; review advisories before adding a package.
- No custom Webpack config (would break the Turbopack build in Next 16) unless explicitly justified in an ADR.
