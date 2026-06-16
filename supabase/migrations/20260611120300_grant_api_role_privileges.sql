-- ---------------------------------------------------------------------------
-- Grant base table privileges to the API roles
--
-- Correction to an assumption baked into the initial RLS migration. That file
-- notes: "Supabase grants base table privileges (SELECT/INSERT/UPDATE/DELETE)
-- to the `anon` and `authenticated` roles via default privileges ... so RLS —
-- not GRANT — is the gate." That was true on older Supabase, but the pinned CLI
-- (and current cloud default) NO LONGER auto-exposes new tables to the Data API
-- roles (see the `auto_expose_new_tables` note in config.toml). Without an
-- explicit GRANT, `authenticated` hits "permission denied for table ..." before
-- RLS is ever consulted — breaking both the RLS pgTAP test and any real
-- per-user data access once a user signs in.
--
-- Fix: grant the privileges explicitly and let the existing RLS policies remain
-- the row-level gate (a GRANT only opens the table; RLS still decides which
-- rows are visible/mutable). We also set DEFAULT PRIVILEGES so tables added by
-- later migrations inherit the same surface automatically, restoring the
-- behaviour the RLS migration originally assumed. This is forward-compatible
-- and applies identically to local and hosted projects.
-- ---------------------------------------------------------------------------

-- Schema usage (normally already present for the API roles; harmless to repeat).
grant usage on schema public to anon, authenticated;

-- Existing tables. SELECT is broad because RLS gates which rows are returned —
-- e.g. anon gets a SELECT grant on the personal tables but sees zero rows there
-- (no anon policy). Writes are limited to `authenticated`, again RLS-gated.
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

-- Future tables created by `postgres` (i.e. by later migrations) inherit the
-- same grants, so we don't have to repeat this in every schema migration.
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;
