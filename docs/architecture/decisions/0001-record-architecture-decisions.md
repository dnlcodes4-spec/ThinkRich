# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** DNLCodess
- **Supersedes / Superseded by:** none

## Context

We are starting a multi-surface platform with several consequential technical choices ahead
(framework, backend, authorization model, delivery mechanism). Decisions made now will shape
the system for its lifetime. Without a record, the *reasoning* behind choices is lost, and
future contributors re-litigate settled questions or unknowingly violate constraints.

We also want to work to the standard of a mature engineering organization, where documenting
significant decisions is routine.

## Decision

We will record architecturally significant decisions as **Architecture Decision Records
(ADRs)** stored in `docs/architecture/decisions/`, one file per decision, numbered
sequentially, using the Nygard format. ADRs are immutable once accepted; a changed decision
is captured by a new ADR that supersedes the old one.

## Options considered

1. **ADRs in the repo (chosen)** — versioned with the code, reviewed via PR, close to the work.
2. **Decisions in an external wiki/Notion** — easy editing, but drifts from the code, no PR review, easily lost.
3. **No formal record** — lowest effort, highest long-term cost; reasoning evaporates.

## Consequences

- **Positive:** durable rationale; onboarding is faster; decisions get deliberate review;
  changes are traceable over time.
- **Positive:** encourages thinking a decision through before committing to it.
- **Negative:** a small, ongoing writing overhead — mitigated by keeping ADRs short and only
  writing them for genuinely significant decisions.
