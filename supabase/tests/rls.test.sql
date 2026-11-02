begin;
select plan(10);
select set_config('request.jwt.claim.role', 'service_role', true);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '11111111-1111-4111-8111-111111111111',
    'authenticated', 'authenticated', 'visa-test-a@example.invalid', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'authenticated', 'authenticated', 'visa-test-b@example.invalid', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.saved_trips (
  id, user_id, origin_country_id, destination_country_id, travel_purpose,
  passport_type, arrival_date
) values (
  '33333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  (select id from public.countries where iso2 = 'TZ'),
  (select id from public.countries where iso2 = 'KE'),
  'tourism', 'ordinary', '2027-03-15'
);

insert into public.subscriptions (user_id, provider, subscription_status, entitlement_level)
values ('11111111-1111-4111-8111-111111111111', 'test', 'inactive', 'free');

insert into public.visa_rules (
  id, origin_country_id, destination_country_id, travel_purpose,
  passport_type, entry_pathway, verification_status
) values (
  '44444444-4444-4444-8444-444444444444',
  (select id from public.countries where iso2 = 'TZ'),
  (select id from public.countries where iso2 = 'KE'),
  'tourism', 'ordinary', 'unknown', 'draft'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select is(
  (select count(*)::integer from public.saved_trips),
  0,
  'anonymous users cannot read saved trips'
);
select is(
  (select count(*)::integer from public.visa_rules where id = '44444444-4444-4444-8444-444444444444'),
  0,
  'anonymous users cannot read draft visa rules'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select count(*)::integer from public.saved_trips where id = '33333333-3333-4333-8333-333333333333'),
  0,
  'user A cannot read user B trip'
);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select is(
  (select count(*)::integer from public.saved_trips where id = '33333333-3333-4333-8333-333333333333'),
  1,
  'user B can read their own trip'
);
throws_ok(
  $$insert into public.saved_trips (
    user_id, origin_country_id, destination_country_id, travel_purpose,
    passport_type, departure_date, arrival_date
  ) values (
    '22222222-2222-4222-8222-222222222222',
    (select id from public.countries where iso2 = 'TZ'),
    (select id from public.countries where iso2 = 'KE'),
    'tourism', 'ordinary', '2027-03-16', '2027-03-15'
  )$$,
  '23514',
  null,
  'departure cannot be after destination arrival'
);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select is(
  (with changed as (
    update public.subscriptions set entitlement_level = 'premium'
    where user_id = '11111111-1111-4111-8111-111111111111'
    returning user_id
  ) select count(*)::integer from changed),
  0,
  'users cannot update their own subscription entitlement'
);
select is(
  (with changed as (
    update public.visa_rules set verification_status = 'published'
    where id = '44444444-4444-4444-8444-444444444444'
    returning id
  ) select count(*)::integer from changed),
  0,
  'non-reviewers cannot publish visa rules'
);
lives_ok(
  $$insert into public.saved_trips (
    user_id, origin_country_id, destination_country_id, travel_purpose,
    passport_type, arrival_date
  ) values (
    '11111111-1111-4111-8111-111111111111',
    (select id from public.countries where iso2 = 'TZ'),
    (select id from public.countries where iso2 = 'RW'),
    'tourism', 'ordinary', '2027-04-01'
  )$$,
  'a free user can save one trip'
);
throws_ok(
  $$insert into public.saved_trips (
    user_id, origin_country_id, destination_country_id, travel_purpose,
    passport_type, arrival_date
  ) values (
    '11111111-1111-4111-8111-111111111111',
    (select id from public.countries where iso2 = 'TZ'),
    (select id from public.countries where iso2 = 'UG'),
    'tourism', 'ordinary', '2027-05-01'
  )$$,
  'P0001',
  null,
  'free users cannot save a second trip'
);

reset role;
select is(
  (select entitlement_level from public.subscriptions where user_id = '11111111-1111-4111-8111-111111111111'),
  'free',
  'subscription entitlement remains unchanged after the rejected update'
);
select * from finish();
rollback;
