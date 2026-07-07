-- ---------------------------------------------------------------------------
-- Waitlist access-control test (pgTAP)
--
-- The waitlist holds captured email addresses and must never be reachable
-- through the public Data API roles — the `anon` key ships to the browser, so
-- a readable table would leak (and let anyone enumerate) the email list. Rows
-- are written exclusively by the server-side capture endpoint via the service
-- role, which bypasses RLS.
--
-- This proves: (1) anon and authenticated get a hard permission-denied on both
-- read and write, (2) the privileged writer can insert, and (3) the unique
-- constraint makes a duplicate address a graceful no-op via ON CONFLICT.
--
--     supabase test db
-- ---------------------------------------------------------------------------

begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

-- --- anon is locked out entirely (grants revoked → 42501 before RLS) --------
set local role anon;

select throws_ok(
  $$ select * from public.waitlist $$,
  '42501',
  'permission denied for table waitlist',
  'anon CANNOT read the waitlist'
);

select throws_ok(
  $$ insert into public.waitlist (email) values ('sneaky@example.com') $$,
  '42501',
  'permission denied for table waitlist',
  'anon CANNOT write to the waitlist'
);

-- --- authenticated is locked out too ---------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select throws_ok(
  $$ select * from public.waitlist $$,
  '42501',
  'permission denied for table waitlist',
  'authenticated CANNOT read the waitlist'
);

select throws_ok(
  $$ insert into public.waitlist (email) values ('sneaky@example.com') $$,
  '42501',
  'permission denied for table waitlist',
  'authenticated CANNOT write to the waitlist'
);

-- --- The privileged server-side writer (RLS/grants bypassed) ---------------
reset role;
select set_config('request.jwt.claims', '', true);

insert into public.waitlist (email, referral_source)
values ('taster@example.com', 'landing');

-- A duplicate sign-up is a graceful no-op, exactly as the endpoint issues it.
insert into public.waitlist (email)
values ('taster@example.com')
on conflict (email) do nothing;

select is(
  (select count(*)::int from public.waitlist where email = 'taster@example.com'),
  1,
  'duplicate email does not create a second row (ON CONFLICT DO NOTHING)'
);

select is(
  (select referral_source from public.waitlist where email = 'taster@example.com'),
  'landing',
  'referral_source is persisted with the sign-up'
);

select * from finish();

rollback;
