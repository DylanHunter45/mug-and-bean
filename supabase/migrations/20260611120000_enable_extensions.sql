-- ---------------------------------------------------------------------------
-- Extensions
--
-- pg_trgm powers fuzzy / trigram search for the scan-confirmation autocomplete
-- (roaster name + origin): autocomplete relies on trigram matching, not naive
-- LIKE.
--
-- Supabase installs extensions into the dedicated `extensions` schema, which is
-- already on the default search_path for the API roles.
-- ---------------------------------------------------------------------------

create extension if not exists "pg_trgm" with schema extensions;
