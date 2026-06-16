-- ---------------------------------------------------------------------------
-- Initial schema
--
-- Core relational model for Mug & Bean. The catalog (`roasters`, `coffees`,
-- `flavour_tags`, `coffee_flavour_tags`) is shared and publicly readable; a
-- user's personal cellar (`user_coffees`) and everything that hangs off it
-- (`brew_logs`, `ratings`) is per-user and isolated by RLS (see the next
-- migration).
--
-- Design note: `coffees` is the shared bag-level catalog;
-- `user_coffees` is the join between a user and a coffee — ratings, brew logs,
-- and the cellar all hang off `user_coffees`, never off `coffees` directly.
--
-- Tables deliberately NOT created here — they belong to later tasks so
-- we don't scaffold ahead of need: `waitlist`, `scan_logs`
--, `user_palate_profile`.
-- ---------------------------------------------------------------------------

-- --- Enum types ------------------------------------------------------------
-- App-controlled value sets get enums. `roast_level` is intentionally left as
-- free text on `coffees` because it mirrors whatever the bag/OCR reports;
-- normalisation for filtering happens in the application layer.

create type public.coffee_status as enum ('wishlist', 'currently_brewing', 'finished');
create type public.entry_source  as enum ('scan', 'manual');

-- --- Shared helper: touch updated_at --------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- users — mirror of auth.users, holding app-level profile fields.
-- Rows are created automatically by the on_auth_user_created trigger below.
-- ===========================================================================

create table public.users (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null unique,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.users is 'App-level profile, 1:1 with auth.users.';

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Auto-provision a public.users row whenever a new auth user signs up.
-- SECURITY DEFINER so it can write past RLS; search_path pinned for safety.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- roasters — shared catalog of coffee roasters.
-- ===========================================================================

create table public.roasters (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique,
  country     text,
  city        text,
  website_url text,
  description text,
  logo_url    text,
  created_by  uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.roasters is 'Shared catalog of roasters; publicly readable.';

create trigger roasters_set_updated_at
  before update on public.roasters
  for each row execute function public.set_updated_at();

-- Trigram index for fuzzy autocomplete on roaster name (scan-confirmation UI).
create index roasters_name_trgm_idx
  on public.roasters using gin (name extensions.gin_trgm_ops);

-- ===========================================================================
-- coffees — shared, bag-level catalog. The seed corpus also serves
-- as the OCR ground-truth dataset.
-- ===========================================================================

create table public.coffees (
  id              uuid primary key default gen_random_uuid(),
  roaster_id      uuid references public.roasters (id) on delete set null,
  name            text not null,
  origin_country  text,
  region          text,
  process         text,
  varietal        text,
  roast_level     text,            -- free text: mirrors the label / OCR output
  altitude_meters integer,
  tasting_notes   text,            -- raw notes as printed; structured tags below
  bag_image_url   text,
  is_decaf        boolean not null default false,
  description     text,
  created_by      uuid references public.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.coffees is 'Shared bag-level coffee catalog; publicly readable.';

create trigger coffees_set_updated_at
  before update on public.coffees
  for each row execute function public.set_updated_at();

create index coffees_roaster_id_idx on public.coffees (roaster_id);
-- Trigram indexes for fuzzy autocomplete on origin + coffee name.
create index coffees_origin_country_trgm_idx
  on public.coffees using gin (origin_country extensions.gin_trgm_ops);
create index coffees_name_trgm_idx
  on public.coffees using gin (name extensions.gin_trgm_ops);

-- ===========================================================================
-- flavour_tags — controlled vocabulary of tasting-note tags.
-- ===========================================================================

create table public.flavour_tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  category   text,                 -- e.g. fruity / chocolate / nutty / floral
  created_at timestamptz not null default now()
);

comment on table public.flavour_tags is 'Controlled vocabulary of flavour tags.';

-- ===========================================================================
-- coffee_flavour_tags — many-to-many between coffees and flavour_tags.
-- ===========================================================================

create table public.coffee_flavour_tags (
  coffee_id      uuid not null references public.coffees (id) on delete cascade,
  flavour_tag_id uuid not null references public.flavour_tags (id) on delete cascade,
  primary key (coffee_id, flavour_tag_id)
);

comment on table public.coffee_flavour_tags is 'M:N join: coffees <-> flavour_tags.';

-- Reverse-lookup index (PK already covers coffee_id-first lookups).
create index coffee_flavour_tags_tag_idx
  on public.coffee_flavour_tags (flavour_tag_id);

-- ===========================================================================
-- user_coffees — a user's logged instance of a coffee (the personal cellar).
-- This is the join between a user and a catalog coffee.
-- ===========================================================================

create table public.user_coffees (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  coffee_id      uuid not null references public.coffees (id) on delete cascade,
  status         public.coffee_status not null default 'currently_brewing',
  source         public.entry_source  not null default 'manual',
  personal_notes text,
  purchased_at   date,
  opened_at      date,
  finished_at    date,
  bag_image_url  text,             -- user's own photo, overrides catalog art
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.user_coffees is 'A user''s logged coffee instance (personal cellar).';

create trigger user_coffees_set_updated_at
  before update on public.user_coffees
  for each row execute function public.set_updated_at();

create index user_coffees_user_id_idx        on public.user_coffees (user_id);
create index user_coffees_coffee_id_idx      on public.user_coffees (coffee_id);
-- Composite supports the common "my cellar filtered by status" query.
create index user_coffees_user_status_idx    on public.user_coffees (user_id, status);

-- ===========================================================================
-- brew_logs — brew parameters for a user_coffee. user_id is denormalised for
-- simple, index-friendly RLS.
-- ===========================================================================

create table public.brew_logs (
  id               uuid primary key default gen_random_uuid(),
  user_coffee_id   uuid not null references public.user_coffees (id) on delete cascade,
  user_id          uuid not null references public.users (id) on delete cascade,
  brew_method      text not null,           -- AeroPress, Pour Over, Espresso, ...
  grind_setting    text,
  dose_grams       numeric(5, 1),
  yield_grams      numeric(6, 1),
  brew_time_seconds integer,
  water_temp_c     numeric(4, 1),
  notes            text,
  brewed_at        timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

comment on table public.brew_logs is 'Brew parameters logged against a user_coffee.';

create index brew_logs_user_coffee_id_idx on public.brew_logs (user_coffee_id);
create index brew_logs_user_id_idx        on public.brew_logs (user_id);

-- ===========================================================================
-- ratings — a user's 1-5 score for one of their logged coffees. One rating per
-- user_coffee. Community averages are computed by joining through user_coffees
-- to coffee_id; ratings are publicly readable to allow that aggregate.
-- ===========================================================================

create table public.ratings (
  id             uuid primary key default gen_random_uuid(),
  user_coffee_id uuid not null references public.user_coffees (id) on delete cascade,
  user_id        uuid not null references public.users (id) on delete cascade,
  score          smallint not null check (score between 1 and 5),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_coffee_id)
);

comment on table public.ratings is 'A user''s 1-5 rating for one of their user_coffees.';

create trigger ratings_set_updated_at
  before update on public.ratings
  for each row execute function public.set_updated_at();

create index ratings_user_id_idx on public.ratings (user_id);
