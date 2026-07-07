-- ---------------------------------------------------------------------------
-- Grant base table privileges to the service role
--
-- Companion to 20260611120300_grant_api_role_privileges.sql, which granted the
-- `anon` and `authenticated` roles their table privileges (and set default
-- privileges so later tables inherit them). That migration deliberately left out
-- `service_role`, on the assumption Supabase's platform bootstrap covers it.
--
-- It does not, for migration-created tables under the pinned CLI: the
-- service-role client (src/lib/supabase/admin.ts) hits "permission denied for
-- table ..." before RLS is ever consulted - which is exactly why the waitlist
-- migration had to `grant ... to service_role` by hand. The seed pipeline
-- (npm run db:seed) writes the whole catalog via that same admin client, so
-- rather than repeat the one-off grant per table, restore the behaviour every
-- table should have: the server-only, RLS-bypassing service role can administer
-- any public table.
--
-- Safe: service_role is never shipped to the browser (server-only), and RLS
-- still exists for the anon/authenticated Data API roles. This does not loosen
-- the waitlist posture (its revoke of anon/authenticated stands).
-- ---------------------------------------------------------------------------

grant usage on schema public to service_role;

grant select, insert, update, delete
  on all tables in schema public to service_role;

-- Future tables created by later migrations inherit the same access.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
