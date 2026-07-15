# ADR-0008: Single navy + gold brand — Think-Winners reverts from green

- **Status:** Accepted (amended by [ADR-0010](0010-thinkrich-black-brand.md) — ThinkRich moves to black + gold; Think-Winners stays navy)
- **Date:** 2026-07-14
- **Deciders:** DNLCodess (client-confirmed via [CR-0005](../../project/change-requests/0005-think-winners-navy-brand.md))
- **Supersedes:** [ADR-0007](0007-dual-brand-palette.md) (dual navy/green brand)

## Context

ADR-0007 established a **dual-brand** palette — ThinkRich Community in navy + gold, Think-Winners
Movement in green + gold — inferred from the client's infographics. On reviewing the actual
Think-Winners logo (`public/logo.jpeg`, navy + gold), we confirmed the green was a
**miscommunication** (CR-0005): the client always intended navy. The logo is the source of truth.

## Decision

**Both ThinkRich Community and Think-Winners Movement use navy + gold** — a single, consistent brand.

- The `[data-brand="think-winners"]` override (which set `--primary` to green) is **removed**;
  Think-Winners inherits the default navy `:root` primary.
- The token architecture from ADR-0006 (semantic tokens, gold accent, neutrals, status) is unchanged.
- The `green-*` scale remains defined in the token set but is **currently unused** — retained only in
  case a future ThinkRich arm wants it (a per-`data-brand` override can be re-introduced then).

## Consequences

- **+** One coherent brand; simpler theming; the landing matches the logo.
- **+** No per-brand switching to reason about for the current surfaces.
- **−** The green work in T-014/T-017 was re-themed to navy (mechanical; green preserved in git history).
- The dual-brand mechanism (`data-brand`) is dormant, not deleted — cheap to revive per-arm later.

## Alternatives considered

1. **Keep green for Think-Winners** — rejected: contradicts the logo and the client's confirmed intent.
2. **Re-theme the whole system to green** — rejected: navy is the established brand (ADR-0006) and the logo.
