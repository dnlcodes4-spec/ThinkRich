-- CR-0026 / ADR-0018: add the partner_admin role, the apex of a partner
-- organisation's own hierarchy. This migration ONLY adds the enum value;
-- Postgres forbids using a new enum value in the transaction that adds it, so
-- role_rank + policies that reference 'partner_admin' land in 0045/0046.
alter type public.user_role add value if not exists 'partner_admin' after 'super_admin';
