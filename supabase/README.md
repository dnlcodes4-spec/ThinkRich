# Supabase — database

Schema and seed data live here as **versioned SQL migrations** (`migrations/`). They are the
source of truth for the database and are applied to the project in order.

## Applying migrations

We currently apply migrations via the Supabase MCP (`apply_migration`) against the remote project
(there is no local CLI stack yet). Every applied migration is also committed here so the schema is
reviewable and reproducible. When a local/staging stack is added, `supabase db push` / CLI
migrations will use these same files.

**After any schema change, regenerate types** into `lib/database.types.ts`
(MCP `generate_typescript_types`, or `supabase gen types typescript`), and run the security
advisor (MCP `get_advisors type=security`) to catch missing RLS.

## Migrations so far

| File | What |
|------|------|
| `0001_geography.sql` | states → lgas → wards, units + unit_wards; reference-data RLS (world-readable, service-role writes) |
| `0002_seed_states.sql` | the 37 first-order divisions (36 states + FCT) with 2-letter codes |

Identity (`profiles`, `members`) and the hierarchical role/scope RLS land in the next migration
(their own focused PR). Workflow/content tables (change requests, candidates, notifications) come
with the features that own them.

## Geography import (LGAs & wards) — pending an authoritative dataset

States are seeded. **LGAs and wards are intentionally NOT seeded from memory** — this system
scopes members (and their vote) by ward, so the data must come from an authoritative source
(e.g. an INEC export), not be approximated.

### Expected dataset format

Provide a CSV (or JSON) with one **ward** per row, carrying its LGA and state:

```csv
state_code,lga_name,lga_code,ward_name
LA,Ikeja,IKJ,Alausa
LA,Ikeja,IKJ,Ojodu
LA,Surulere,SUR,Aguda
...
```

- `state_code` must match a seeded state code (see `0002_seed_states.sql`).
- `lga_code` is a short (≈3-letter) code, unique within the state, used in membership numbers
  (`TWM-<STATE>-<LGA>-<seq>`).
- `ward_name` is unique within its LGA.

### Loading it

Drop the file in and it's loaded with an idempotent import migration (LGAs upserted from the
distinct `(state, lga)` pairs, then wards). A template loader will be added with the file so the
import is a reviewed migration, not a manual dashboard action.

> Units (2+ wards) are defined per the movement's own structure and are created via the admin
> tools, not the geographic import.
