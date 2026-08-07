-- CR-0015 / ADR-0017: add the super_admin (owner) role above national_admin.
-- This migration ONLY adds the enum value. Postgres forbids using a new enum
-- value in the same transaction that adds it, so role_rank + the policies that
-- reference 'super_admin' land in 0040 (a separate migration, applied after this
-- one commits).
alter type public.user_role add value if not exists 'super_admin' before 'national_admin';
