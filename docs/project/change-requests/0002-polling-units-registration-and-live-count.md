# CR-0002: Polling units, member registration fields, live counts, and ThinkRich content

- **Status:** Assessed
- **Requested by:** Client (relayed by DNLCodess)
- **Date requested:** 2026-07-13
- **Channel:** WhatsApp (relayed)
- **Related:** [CR-0001](0001-brand-org-structure-and-dual-landing.md) · ADR-0005 (RLS) · geography schema (0001) · content in [thinkrich-community-arms.md](../content/thinkrich-community-arms.md)

## 1. What the client asked for

A batch of clarifications and additions:

1. **"Unit" means "Polling Unit."** The Unit tier is **polling-unit leaders**. So the geographic
   hierarchy is **State → LGA → Ward → Polling Unit**, and members are assigned to a polling unit
   (useful when assigning polling-unit agents). The client will source the full States → LGAs →
   Wards → Polling Units dataset and provide it.
2. **Member registration fields.** Leaders register members with the standard fields **plus**:
   passport photograph, **VIN** (voter's ID number), **NIN** (national ID number), account number,
   account name, bank name, **date of birth (must be ≥ 18 to register)**, **L.G, Ward, Polling
   Unit** (these three auto-loaded/selected by the system).
3. **Prevent double registration** using suitable info — client + our recommendation: **use NIN**.
4. **Live counts on the landing page.** The 20,000 leaders / 200,000 voters are **projected
   goals**; the landing should also show a **live count** of actual registrations.
5. **ThinkRich Community + six arms content** supplied for the public site / ThinkRich landing
   (T-016). Captured verbatim in [thinkrich-community-arms.md](../content/thinkrich-community-arms.md).
6. **Think-Winners landing purpose** confirmed: inform visitors (prospective members) about the
   movement and entice them to join.

## 2. Why

Accurate electoral structure (polling units) is essential for assigning agents and scoping voters;
the extra registration fields support agent assignment and payments; NIN gives a reliable unique
identity for de-duplication; live counts build credibility/momentum for recruitment.

## 3. Impact analysis

- **Geography schema (correction).** Our applied migration `0001_geography.sql` modelled `units`
  as "2+ wards" with a `unit_wards` join — **that is now wrong.** Correct model: **`polling_units`
  belong to a `ward`** (a ward has many polling units). Needs a corrective migration
  (drop `units`/`unit_wards`, add `polling_units`). Low risk — those tables are empty (no data
  depends on them yet). The import dataset grows to include polling units. Blocked on: Supabase MCP
  reconnected (to apply) + the client's dataset.
- **Identity/members schema.** The `members` table gains: `passport_photo_url`, `vin`, `nin`,
  `account_number`, `account_name`, `bank_name`, `date_of_birth`, `polling_unit_id` (+ existing
  ward/lga/state). Constraints: **age ≥ 18** at registration (DB check on `date_of_birth`);
  **`nin` UNIQUE** (the no-duplicate-registration invariant). **Resolves open question Q6.**
  Sensitive PII (NIN, VIN, bank details) → tighten RLS + never expose beyond the caller's scope.
- **Roles.** `unit_coordinator` = **polling-unit** coordinator (terminology confirmed; scope FK
  becomes `polling_unit_id`).
- **Landing (T-017).** The hero stat strip currently reads as *current* — it must be framed as
  the **projected goal**, with a **live count** of real registrations. The live count needs the
  members table + a count query (pending the member system). Interim: label as goal; wire the live
  count when data exists.
- **Public site / ThinkRich landing (T-016).** Now has real content for all six arms + umbrella.
- **Privacy/compliance.** Collecting NIN/VIN/bank details raises data-sensitivity; ensure lawful
  basis, encryption at rest (Supabase default), strict RLS, and no PII in logs/notifications.

## 4. Decisions

- **Proceed.** 
- **Q6 resolved → dedup key = NIN** (unique constraint). Update roadmap/data-model.
- **"Unit" = polling unit** across schema, roles, and docs.
- Needs a **data-model doc update** and a **corrective geography migration** (no new ADR — this
  refines existing decisions rather than reversing them; ADR-0005 RLS still holds).

## 5. Plan (tasks)

- [ ] **T-018** — Correct geography schema: `polling_units` (per ward); drop `units`/`unit_wards`.
      Update the import format (add polling units) in `supabase/README.md`. _(Blocked: MCP + dataset.)_
- [ ] **T-001b** — Identity migration: `profiles` + `members` with the full field set (VIN, NIN,
      bank, DOB≥18, polling_unit) + **NIN unique** + hierarchical RLS. _(Blocked: MCP; needs Q1 login.)_
- [ ] **T-019** — Live registration counts on the Think-Winners landing (goal vs live actual).
      _(Blocked: members table + data.)_
- [ ] **T-020** — Interim: reframe landing stat numbers as **projected goal/target** (honest now).
- [ ] **T-016** — ThinkRich Community landing + public product showcase (six arms) from the
      captured content.
- [ ] Update `data-model.md` (polling units, member fields, NIN dedup), roadmap (Q6), CR register.

## 6. Rollback plan

Geography correction is a forward migration on empty tables (reversible with a down migration).
Landing copy changes are trivially revertible. No production data affected yet.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
