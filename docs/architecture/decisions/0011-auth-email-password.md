# ADR-0011: Authentication — email + password via Supabase Auth

- **Status:** Accepted
- **Date:** 2026-07-16
- **Deciders:** DNLCodess
- **Relates to:** [ADR-0003](0003-supabase-as-backend.md) (Supabase), [ADR-0005](0005-rls-as-authorization-boundary.md) (RLS), resolves roadmap **Q1**

## Context

ADR-0003 selected Supabase for auth, but the **login credential** was left open (roadmap Q1:
membership number, phone, or email?). The system has a hard constraint from the security model:
**nobody self-signs-up** — admins and leaders are provisioned by an admin above them, and a
member's account is created by their leader during registration. So the credential choice is
really "what does a provisioned user sign in with."

## Decision

**All roles authenticate with email + password** via Supabase Auth (the GoTrue email provider),
using the existing SSR cookie session (`proxy.ts` + `lib/supabase/*`).

- Accounts are **provisioned, never self-registered**: there is no public sign-up route. The login
  page only signs existing users in.
- A **member therefore must have an email** captured at registration so their account can be
  created. This adds `email` to the member-registration inputs (amends the CR-0002 field list) and
  is a prerequisite for T-004.
- Password lifecycle: a provisioned user gets an initial password or an invite/reset link
  (Supabase password-reset email), so the creating admin/leader never holds the final password.

## Options considered

1. **Email + password (chosen)** — pros: native to Supabase (sessions, password reset, security
   hardening all built-in); familiar; least custom code. Cons: every member needs an email.
2. **Membership number + password** — pros: no email needed. Cons: not a native Supabase identity;
   requires a custom credential mapping and loses built-in reset/verification flows; more surface
   to get wrong on a security-critical path.
3. **Phone + OTP** — pros: no email; phone is common. Cons: SMS cost/deliverability in Nigeria;
   OTP infra; still needs a provider. Deferred as a possible future option.

## Consequences

- **+** Sign-in, session refresh, and password reset ride on Supabase; minimal custom auth code.
- **+** One mechanism for every role; RLS remains the authorization boundary (ADR-0005).
- **−** Every member needs an email. Some grassroots members may not have one — the registration
  flow (T-004) must decide how to handle that (e.g. required field, or a leader-managed address).
  Tracked as a risk.
- **Follow-ups:** T-004 collects `email` and provisions the auth account; an invite/password-set
  flow for provisioned users; admin account-provisioning (T-003x/T-…) creates admin/leader logins.
