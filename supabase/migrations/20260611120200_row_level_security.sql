-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- RLS is the authorization layer: per-user isolation is enforced in
-- the database, not just the application. Two buckets:
--
--   * Catalog (roasters, coffees, flavour_tags, coffee_flavour_tags)
--       -> world-readable; authenticated users may contribute entries.
--   * Personal (user_coffees, brew_logs, ratings, users)
--       -> a user can only touch their own rows (auth.uid() = user_id).
--
-- ratings are an intentional exception on SELECT: publicly readable so that
-- community average ratings can be aggregated across users. Writes stay owner-
-- only.
--
-- Note: Supabase grants base table privileges (SELECT/INSERT/UPDATE/DELETE) to
-- the `anon` and `authenticated` roles via default privileges on the public
-- schema, so RLS — not GRANT — is the gate here.
-- ---------------------------------------------------------------------------

-- Enable RLS on every table. With RLS on and no policy, access is denied by
-- default; the policies below open the minimum required surface.
alter table public.users               enable row level security;
alter table public.roasters            enable row level security;
alter table public.coffees             enable row level security;
alter table public.flavour_tags        enable row level security;
alter table public.coffee_flavour_tags enable row level security;
alter table public.user_coffees        enable row level security;
alter table public.brew_logs           enable row level security;
alter table public.ratings             enable row level security;

-- ===========================================================================
-- users — self access only.
-- ===========================================================================

create policy "users: read own profile"
  on public.users for select
  to authenticated
  using (auth.uid() = id);

create policy "users: update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Inserts normally come from the SECURITY DEFINER signup trigger; this allows a
-- user to self-provision their own row as a fallback, but never someone else's.
create policy "users: insert own profile"
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);

-- ===========================================================================
-- roasters — public read, authenticated contribute (own rows only).
-- ===========================================================================

create policy "roasters: public read"
  on public.roasters for select
  to anon, authenticated
  using (true);

create policy "roasters: authenticated insert"
  on public.roasters for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "roasters: creator update"
  on public.roasters for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- ===========================================================================
-- coffees — public read, authenticated contribute (own rows only).
-- ===========================================================================

create policy "coffees: public read"
  on public.coffees for select
  to anon, authenticated
  using (true);

create policy "coffees: authenticated insert"
  on public.coffees for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "coffees: creator update"
  on public.coffees for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- ===========================================================================
-- flavour_tags — public read; authenticated may add tags to the vocabulary.
-- ===========================================================================

create policy "flavour_tags: public read"
  on public.flavour_tags for select
  to anon, authenticated
  using (true);

create policy "flavour_tags: authenticated insert"
  on public.flavour_tags for insert
  to authenticated
  with check (true);

-- ===========================================================================
-- coffee_flavour_tags — public read; authenticated may link tags to coffees.
-- ===========================================================================

create policy "coffee_flavour_tags: public read"
  on public.coffee_flavour_tags for select
  to anon, authenticated
  using (true);

create policy "coffee_flavour_tags: authenticated insert"
  on public.coffee_flavour_tags for insert
  to authenticated
  with check (true);

create policy "coffee_flavour_tags: authenticated delete"
  on public.coffee_flavour_tags for delete
  to authenticated
  using (true);

-- ===========================================================================
-- user_coffees — owner-only, full CRUD.
-- ===========================================================================

create policy "user_coffees: owner select"
  on public.user_coffees for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_coffees: owner insert"
  on public.user_coffees for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_coffees: owner update"
  on public.user_coffees for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_coffees: owner delete"
  on public.user_coffees for delete
  to authenticated
  using (auth.uid() = user_id);

-- ===========================================================================
-- brew_logs — owner-only, full CRUD.
-- ===========================================================================

create policy "brew_logs: owner select"
  on public.brew_logs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "brew_logs: owner insert"
  on public.brew_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "brew_logs: owner update"
  on public.brew_logs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "brew_logs: owner delete"
  on public.brew_logs for delete
  to authenticated
  using (auth.uid() = user_id);

-- ===========================================================================
-- ratings — public read (for community averages); owner-only writes.
-- ===========================================================================

create policy "ratings: public read"
  on public.ratings for select
  to anon, authenticated
  using (true);

create policy "ratings: owner insert"
  on public.ratings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "ratings: owner update"
  on public.ratings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ratings: owner delete"
  on public.ratings for delete
  to authenticated
  using (auth.uid() = user_id);
