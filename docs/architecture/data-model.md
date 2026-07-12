# Data Model

The authoritative schema is defined by the SQL migrations in `supabase/migrations/`. This
document is the human-readable companion: the entities, relationships, and the rules the
schema must enforce. Keep it in sync when migrations change.

> Some fields are marked **TBD** pending client input (membership-number format, login
> credential, card design). These are tracked as [open decisions](../project/roadmap.md#open-questions).

---

## Entity–relationship diagram

```mermaid
erDiagram
    states ||--o{ lgas : contains
    lgas ||--o{ wards : contains
    units ||--o{ unit_wards : groups
    wards ||--o{ unit_wards : "belongs to"

    auth_users ||--|| profiles : "1:1"
    profiles ||--o{ members : "leader registers (<=10)"
    states ||--o{ members : "scoped to"
    lgas ||--o{ members : "scoped to"
    wards ||--o{ members : "scoped to"

    members ||--o{ change_requests : submits
    members ||--o{ opt_out_requests : submits
    profiles ||--o{ leader_kym_codes : has
    profiles ||--o{ push_subscriptions : registers

    states ||--o{ candidates : "state candidate"
    lgas ||--o{ candidates : "lg candidate"
    profiles ||--o{ notifications : receives
```

---

## Reference / geography

| Table | Key columns | Notes |
|-------|-------------|-------|
| `states` | `id`, `name`, `code`, `is_active` | 36 states + FCT (confirm). `is_active` true once a State Admin is assigned. |
| `lgas` | `id`, `state_id`, `name` | Local Government Areas. |
| `wards` | `id`, `lga_id`, `name` | Smallest geographic unit. |
| `units` | `id`, `lga_id`, `name` | A **unit = 2+ wards**. |
| `unit_wards` | `unit_id`, `ward_id` | Many-to-many join (a unit groups wards). |

## Identity & roles

| Table | Key columns | Notes |
|-------|-------------|-------|
| `profiles` | `id` (=`auth.users.id`), `role`, `state_id?`, `lga_id?`, `unit_id?`, `full_name`, `status` | 1:1 with Supabase `auth.users`. Scope FKs non-null only at the relevant level. |
| `members` | `id`, `membership_number` (unique, immutable), `registered_by` (leader), `state_id`, `lga_id`, `ward_id`, demographics, `profile_photo_url`, `status` | The membership record. |

**`role` enum:** `national_admin` · `state_admin` · `lg_admin` · `unit_coordinator` · `leader` · `member`.

**`member.status` enum:** `active` · `frozen` · `deleted`.

### Invariants (enforced by DB constraints + Server Actions)

1. `membership_number` is **unique** and **never updated** after insert.
2. A `leader` has **≤ 10** `active` members (`registered_by` count check).
3. **No duplicate registration** — a uniqueness strategy on identifying fields
   (final key **TBD** with client; candidate: normalized name + phone, or a national ID).
4. A member's `state_id`/`lga_id`/`ward_id` are consistent (ward ∈ lga ∈ state).
5. Members cannot self-register: inserts into `members` come only from a leader's Server Action.

## Workflows

| Table | Key columns | Notes |
|-------|-------------|-------|
| `change_requests` | `id`, `member_id`, `field`, `new_value`, `reason`, `status`, `reviewed_by`, `reviewed_at` | Non-photo profile edits. Approved/rejected by State Admin. |
| `opt_out_requests` | `id`, `member_id`, `reason`, `status` (`requested`/`frozen`/`deleted`/`reactivated`) | Freeze → leader retention → delete or reactivate. |
| `leader_kym_codes` | `id`, `leader_id`, `code` (unique) | Leader-to-leader verification (KYM). |

## Movement content

| Table | Key columns | Notes |
|-------|-------------|-------|
| `candidates` | `id`, `level` (`presidential`/`state`/`lg`), `state_id?`, `lga_id?`, `uploaded_by`, details | Members see the candidate for their L.G + the presidential candidate. |
| `notifications` | `id`, `audience` (scope), `title`, `body`, `type`, `created_at` | Voting reminders + major updates; delivered in-app and via Web Push. |
| `push_subscriptions` | `id`, `user_id`, `endpoint`, `keys` | Web Push endpoints per user. |

---

## Row-Level Security summary

Every table has RLS enabled. Representative policies (full SQL in migrations):

| Actor | Can read | Can write |
|-------|----------|-----------|
| National admin | all members, all admins, all states | states activation, admin accounts, presidential candidate |
| State admin | members in their `state_id` | approve/reject change requests in state; state candidates |
| L.G / Unit admin | members in their scope | scoped oversight |
| Leader | their own ≤10 members | register/edit their members; download their cards |
| Member | their own record only | profile photo; submit change/opt-out requests |

See [security-model.md](security-model.md) and
[ADR-0005](decisions/0005-rls-as-authorization-boundary.md) for the reasoning.

## Auditability

Admin actions (activation, edits, approvals, deletions) are recorded for the activity logs
referenced in the app spec. An `audit_log` table is planned in a later phase.
