-- ---------------------------------------------------------------------------
-- waitlist — pre-launch email capture from the public landing page.
--
-- This table is write-only from the outside world: rows are created
-- exclusively by the server-side capture endpoint, which uses the service-role
-- key (and therefore bypasses RLS). The endpoint is the single writer — it
-- normalises and de-duplicates addresses before insert — so there is no
-- per-user owner column and no need for the public API roles to touch the
-- table at all.
--
-- Security posture: the `anon` key ships to the browser (this is a PUBLIC
-- repo), so the email list must never be readable or enumerable through the
-- Data API. RLS is enabled with NO policy (which denies every row to
-- anon/authenticated), AND the base-table grants those roles would otherwise
-- inherit are revoked outright — defence in depth. The service role keeps its
-- access and stays the only path in.
-- ---------------------------------------------------------------------------

create table public.waitlist (
  id              uuid primary key default gen_random_uuid(),
  -- Stored already-normalised (trimmed + lower-cased) by the capture endpoint;
  -- the unique constraint is what makes duplicate sign-ups a graceful no-op.
  email           text not null unique,
  referral_source text,
  created_at      timestamptz not null default now()
);

comment on table public.waitlist is
  'Pre-launch email capture. Written only by the server-side capture endpoint (service role); RLS-locked away from the public Data API roles.';

-- Enable RLS with no policy → anon/authenticated are denied every row. The
-- service role bypasses RLS, so the capture endpoint still writes freely.
alter table public.waitlist enable row level security;

-- The grant migration sets DEFAULT PRIVILEGES that auto-grant select (anon +
-- authenticated) and insert/update/delete (authenticated) on new public
-- tables. Revoke them here so this table is not even reachable by those roles
-- — a hard "permission denied" that sits in front of RLS.
revoke all on public.waitlist from anon, authenticated;

-- The service role is the sole writer/reader (used only from the server). Grant
-- it explicitly so the endpoint works regardless of Supabase's default-privilege
-- bootstrap for that role.
grant select, insert on public.waitlist to service_role;

-- Newest sign-ups first when eyeballing the list / tracking the founding-tasters
-- count in Supabase Studio.
create index waitlist_created_at_idx on public.waitlist (created_at desc);
