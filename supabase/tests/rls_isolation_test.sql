-- ---------------------------------------------------------------------------
-- RLS isolation test (pgTAP)
--
-- Proves that RLS policies prevent cross-user data access, verified with two
-- test accounts. Run with:
--
--     supabase test db
--
-- Strategy: seed two auth users (Alice, Bob) and a shared catalog coffee using
-- the privileged migration role, then drop into the `authenticated` role while
-- impersonating each user via request.jwt.claims (which is what auth.uid()
-- reads) and assert that neither can see or mutate the other's personal rows,
-- while both can read the shared catalog. Ground-truth checks after Bob's
-- mutation attempts are done with `reset role` so they observe the true table
-- state with RLS bypassed (otherwise they'd read back through Bob's filter).
-- ---------------------------------------------------------------------------

begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

-- --- Fixtures (created as the privileged test role, bypassing RLS) ---------
-- Insert into auth.users; the on_auth_user_created trigger mirrors into
-- public.users for us.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"full_name":"Alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com',   '{"full_name":"Bob"}');

-- Shared catalog coffee (created_by Alice).
insert into public.coffees (id, name, created_by)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Test Catalog Coffee',
        '11111111-1111-1111-1111-111111111111');

-- Alice's personal cellar entry + a rating on it.
insert into public.user_coffees (id, user_id, coffee_id)
values ('cccccccc-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-0000-0000-0000-000000000001');

insert into public.ratings (user_coffee_id, user_id, score)
values ('cccccccc-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111', 5);

-- ===========================================================================
-- Act as Alice (auth.uid() resolves request.jwt.claims ->> 'sub')
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.user_coffees),
  1,
  'Alice sees her own user_coffee'
);

select is(
  (select count(*)::int from public.ratings
    where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'Alice sees her own rating'
);

select is(
  (select count(*)::int from public.coffees),
  1,
  'Alice can read the shared catalog'
);

-- ===========================================================================
-- Act as Bob
-- ===========================================================================
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.user_coffees),
  0,
  'Bob CANNOT see Alice''s user_coffee'
);

select is(
  (select count(*)::int from public.coffees),
  1,
  'Bob can still read the shared catalog'
);

-- Bob cannot insert a cellar entry on Alice's behalf (WITH CHECK blocks it).
select throws_ok(
  $$ insert into public.user_coffees (user_id, coffee_id)
     values ('11111111-1111-1111-1111-111111111111',
             'aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501',
  'new row violates row-level security policy for table "user_coffees"',
  'Bob CANNOT insert a user_coffee owned by Alice'
);

-- ratings are publicly readable (needed for community averages).
select is(
  (select count(*)::int from public.ratings),
  1,
  'Bob can read ratings (community-average visibility)'
);

-- Bob's blind mutation attempts — under RLS these match zero of Alice's rows.
update public.user_coffees set personal_notes = 'hacked';
delete from public.user_coffees;
update public.ratings set score = 1;

-- ===========================================================================
-- Verify ground truth with RLS bypassed.
-- ===========================================================================
reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*)::int from public.user_coffees
     where id = 'cccccccc-0000-0000-0000-000000000001'),
  1,
  'Alice''s user_coffee survived Bob''s UPDATE and DELETE'
);

select is(
  (select count(*)::int from public.user_coffees where personal_notes = 'hacked'),
  0,
  'Bob''s UPDATE did not modify Alice''s user_coffee'
);

select is(
  (select score::int from public.ratings
     where user_coffee_id = 'cccccccc-0000-0000-0000-000000000001'),
  5,
  'Bob''s UPDATE could not change Alice''s rating score'
);

select * from finish();

rollback;
