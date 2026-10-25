create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'reviewer', 'publisher')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table private.user_roles enable row level security;

create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.user_roles
    where user_id = (select auth.uid())
      and role = required_role
  );
$$;
revoke all on function public.has_role(text) from public, anon;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.has_role(text) to anon;

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  iso2 text not null unique check (iso2 ~ '^[A-Z]{2}$'),
  iso3 text not null unique check (iso3 ~ '^[A-Z]{3}$'),
  common_name text not null unique,
  official_name text,
  is_supported boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_type text not null check (source_type in ('official', 'licensed_provider', 'other')),
  source_url text not null check (source_url ~ '^https://'),
  provider_reference text,
  license_notes text,
  may_display boolean not null default false,
  may_store boolean not null default false,
  may_cache boolean not null default false,
  last_checked_at timestamptz,
  next_review_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (next_review_at is null or last_checked_at is null or next_review_at >= last_checked_at)
);

create table public.visa_rules (
  id uuid primary key default gen_random_uuid(),
  origin_country_id uuid not null references public.countries(id),
  destination_country_id uuid not null references public.countries(id),
  passport_type text not null default 'ordinary'
    check (passport_type in ('ordinary', 'diplomatic', 'official', 'other')),
  travel_purpose text not null
    check (travel_purpose in ('tourism', 'business', 'transit', 'study', 'work', 'family_visit', 'other')),
  entry_pathway text not null
    check (entry_pathway in ('visa_free', 'visa_on_arrival', 'evisa', 'visa_required', 'eta', 'transit_visa', 'unknown')),
  eligibility_conditions text[] not null default '{}',
  maximum_stay_days integer check (maximum_stay_days is null or maximum_stay_days > 0),
  application_url text check (application_url is null or application_url ~ '^https://'),
  verified_fee_amount numeric(12, 2) check (verified_fee_amount is null or verified_fee_amount >= 0),
  verified_fee_currency text check (verified_fee_currency is null or verified_fee_currency ~ '^[A-Z]{3}$'),
  processing_information text,
  effective_from date,
  effective_until date,
  source_checked_at timestamptz,
  verification_status text not null default 'draft'
    check (verification_status in ('draft', 'pending_review', 'verified', 'published', 'stale', 'withdrawn')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  next_review_at timestamptz,
  conflict_flag boolean not null default false,
  conflict_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (origin_country_id, destination_country_id, passport_type, travel_purpose),
  check (origin_country_id <> destination_country_id),
  check (effective_until is null or effective_from is null or effective_until >= effective_from),
  check ((verified_fee_amount is null) = (verified_fee_currency is null)),
  check (not conflict_flag or conflict_notes is not null)
);

create table public.visa_requirements (
  id uuid primary key default gen_random_uuid(),
  visa_rule_id uuid not null references public.visa_rules(id) on delete cascade,
  requirement_category text not null,
  requirement_name text not null,
  description text not null,
  is_mandatory boolean,
  validity_conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (visa_rule_id, requirement_category, requirement_name)
);

create table public.visa_rule_sources (
  visa_rule_id uuid not null references public.visa_rules(id) on delete cascade,
  data_source_id uuid not null references public.data_sources(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (visa_rule_id, data_source_id)
);

create table public.verification_logs (
  id uuid primary key default gen_random_uuid(),
  visa_rule_id uuid not null references public.visa_rules(id) on delete restrict,
  reviewer_id uuid references auth.users(id) on delete set null,
  verification_method text not null,
  source_references jsonb not null default '[]'::jsonb,
  review_outcome text not null check (review_outcome in ('approved', 'rejected', 'needs_changes', 'conflict')),
  change_summary text,
  previous_version jsonb,
  new_version jsonb,
  notes text,
  reviewed_at timestamptz not null default now()
);

create table public.visa_rule_versions (
  id uuid primary key default gen_random_uuid(),
  visa_rule_id uuid not null references public.visa_rules(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  rule_snapshot jsonb not null,
  effective_from date,
  effective_until date,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  unique (visa_rule_id, version_number)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  origin_country_id uuid not null references public.countries(id),
  destination_country_id uuid not null references public.countries(id),
  travel_purpose text not null
    check (travel_purpose in ('tourism', 'business', 'transit', 'study', 'work', 'family_visit', 'other')),
  passport_type text not null default 'ordinary'
    check (passport_type in ('ordinary', 'diplomatic', 'official', 'other')),
  arrival_date date not null,
  departure_date date,
  trip_status text not null default 'planning' check (trip_status in ('planning', 'ready', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (departure_date is null or departure_date >= arrival_date)
);

create table public.trip_checklists (
  id uuid primary key default gen_random_uuid(),
  saved_trip_id uuid not null references public.saved_trips(id) on delete cascade,
  visa_requirement_id uuid references public.visa_requirements(id) on delete set null,
  item_name text not null,
  description text,
  is_complete boolean not null default false,
  personal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null,
  provider_customer_reference text,
  provider_subscription_reference text unique,
  subscription_status text not null
    check (subscription_status in ('inactive', 'trialing', 'active', 'past_due', 'cancelled', 'expired')),
  entitlement_level text not null default 'free' check (entitlement_level in ('free', 'premium')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  updated_at timestamptz not null default now(),
  check (current_period_end is null or current_period_start is null or current_period_end >= current_period_start)
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  affected_table text not null,
  affected_record_id uuid,
  change_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.has_premium_entitlement()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions
    where user_id = (select auth.uid())
      and entitlement_level = 'premium'
      and subscription_status in ('active', 'trialing')
      and current_period_end is not null
      and current_period_end > now()
  );
$$;
revoke all on function public.has_premium_entitlement() from public, anon;
grant execute on function public.has_premium_entitlement() to authenticated;

create index visa_rules_route_status_idx
  on public.visa_rules (origin_country_id, destination_country_id, travel_purpose, verification_status);
create index visa_rules_review_idx on public.visa_rules (verification_status, next_review_at);
create index visa_requirements_rule_idx on public.visa_requirements (visa_rule_id);
create index visa_rule_sources_source_idx on public.visa_rule_sources (data_source_id);
create index saved_trips_user_updated_idx on public.saved_trips (user_id, updated_at desc);
create index trip_checklists_trip_idx on public.trip_checklists (saved_trip_id);
create index data_sources_review_idx on public.data_sources (next_review_at);
create index verification_logs_rule_reviewed_idx on public.verification_logs (visa_rule_id, reviewed_at desc);
create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_profile_created
after insert on auth.users
for each row execute function public.create_profile_for_user();

create or replace function public.guard_visa_rule_workflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.verification_status <> 'draft' then
      raise exception 'Visa rules must be created as drafts.';
    end if;
    new.created_by := auth.uid();
    new.updated_at := now();
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status then
    if new.verification_status = 'verified' then
      if not (public.has_role('reviewer') or public.has_role('admin')) then
        raise exception 'Reviewer permission is required to verify visa rules.';
      end if;
      if new.source_checked_at is null or not exists (
        select 1 from public.visa_rule_sources s where s.visa_rule_id = old.id
      ) then
        raise exception 'Verification requires a checked source reference.';
      end if;
      if exists (
        select 1
        from public.visa_rule_sources link
        join public.data_sources source on source.id = link.data_source_id
        where link.visa_rule_id = old.id
          and source.source_type = 'licensed_provider'
          and (not source.may_display or not source.may_store)
      ) then
        raise exception 'Licensed sources require confirmed storage and display permission before verification.';
      end if;
      new.verified_by := auth.uid();
      new.verified_at := now();
    elsif new.verification_status = 'published' then
      if old.verification_status <> 'verified'
        or not (public.has_role('publisher') or public.has_role('admin'))
        or new.verified_by is null
        or new.verified_at is null
        or new.source_checked_at is null
        or new.next_review_at is null
        or new.conflict_flag then
        raise exception 'Only an authorized publisher may publish a verified, source-backed rule.';
      end if;
      new.published_by := auth.uid();
      new.published_at := now();
    elsif new.verification_status in ('stale', 'withdrawn')
      and not (public.has_role('reviewer') or public.has_role('publisher') or public.has_role('admin')
        or coalesce(auth.role(), '') = 'service_role'
        or coalesce(current_setting('visacompass.stale_sweep', true), '') = 'on') then
      raise exception 'Editorial permission is required to change visa rule status.';
    elsif new.verification_status = 'pending_review'
      and not (public.has_role('reviewer') or public.has_role('admin')) then
      raise exception 'Reviewer permission is required to submit visa rules for review.';
    elsif new.verification_status = 'draft'
      and not (public.has_role('reviewer') or public.has_role('admin')) then
      raise exception 'Reviewer permission is required to return a visa rule to draft.';
    end if;
  end if;

  if old.verification_status = 'published' and new.verification_status = 'published'
    and (to_jsonb(new) - 'updated_at' - 'conflict_flag' - 'conflict_notes')
      is distinct from (to_jsonb(old) - 'updated_at' - 'conflict_flag' - 'conflict_notes') then
    raise exception 'Published rule content is immutable; return it to review before changing it.';
  end if;

  if new.verification_status = old.verification_status then
    new.verified_by := old.verified_by;
    new.verified_at := old.verified_at;
    new.published_by := old.published_by;
    new.published_at := old.published_at;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger visa_rule_workflow_guard
before insert or update on public.visa_rules
for each row execute function public.guard_visa_rule_workflow();

create or replace function public.record_published_visa_rule_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version integer;
  record_version boolean := false;
  requirements_snapshot jsonb;
  sources_snapshot jsonb;
begin
  if new.verification_status <> 'published' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    record_version := true;
  elsif old.verification_status is distinct from 'published'
    or to_jsonb(new) - 'updated_at' is distinct from to_jsonb(old) - 'updated_at' then
    record_version := true;
  end if;

  if record_version then
    select coalesce(jsonb_agg(to_jsonb(requirement)), '[]'::jsonb)
      into requirements_snapshot
      from public.visa_requirements requirement
      where requirement.visa_rule_id = new.id;
    select coalesce(jsonb_agg(jsonb_build_object(
      'source_id', source.id,
      'source_name', source.source_name,
      'source_type', source.source_type,
      'source_url', source.source_url
    )), '[]'::jsonb)
      into sources_snapshot
      from public.visa_rule_sources link
      join public.data_sources source on source.id = link.data_source_id
      where link.visa_rule_id = new.id;
    select coalesce(max(version_number), 0) + 1
      into next_version
      from public.visa_rule_versions
      where visa_rule_id = new.id;
    insert into public.visa_rule_versions (
      visa_rule_id, version_number, rule_snapshot, effective_from, effective_until, published_by
    ) values (
      new.id,
      next_version,
      jsonb_build_object(
        'rule', to_jsonb(new),
        'requirements', requirements_snapshot,
        'sources', sources_snapshot
      ),
      new.effective_from,
      new.effective_until,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger visa_rule_version_history
after insert or update on public.visa_rules
for each row execute function public.record_published_visa_rule_version();

create or replace function public.record_admin_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_record jsonb;
  record_id uuid;
begin
  changed_record := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  record_id := (changed_record ->> 'id')::uuid;
  insert into public.admin_audit_logs (actor_id, action, affected_table, affected_record_id, change_summary)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    record_id,
    jsonb_build_object(
      'old', case when tg_op = 'INSERT' then null else to_jsonb(old) end,
      'new', case when tg_op = 'DELETE' then null else to_jsonb(new) end
    )
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger audit_visa_rules
after insert or update or delete on public.visa_rules
for each row execute function public.record_admin_audit();

create trigger audit_visa_requirements
after insert or update or delete on public.visa_requirements
for each row execute function public.record_admin_audit();

create trigger audit_data_sources
after insert or update or delete on public.data_sources
for each row execute function public.record_admin_audit();

create or replace function public.guard_published_rule_details()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    if exists (
      select 1 from public.visa_rules rule
      where rule.id = old.visa_rule_id and rule.verification_status = 'published'
    ) then
      raise exception 'Published rule requirements and sources are immutable; return the rule to review first.';
    end if;
  end if;
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if exists (
      select 1 from public.visa_rules rule
      where rule.id = new.visa_rule_id and rule.verification_status = 'published'
    ) then
      raise exception 'Published rule requirements and sources are immutable; return the rule to review first.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger guard_published_visa_requirements
before insert or update or delete on public.visa_requirements
for each row execute function public.guard_published_rule_details();

create trigger guard_published_visa_rule_sources
before insert or update or delete on public.visa_rule_sources
for each row execute function public.guard_published_rule_details();

create or replace function public.guard_published_data_source_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.visa_rule_sources link
    join public.visa_rules rule on rule.id = link.visa_rule_id
    where link.data_source_id = old.id and rule.verification_status = 'published'
  ) then
    raise exception 'A source used by a published rule cannot be changed until that rule returns to review.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger guard_published_data_sources
before update or delete on public.data_sources
for each row execute function public.guard_published_data_source_changes();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'countries', 'data_sources', 'visa_rules', 'visa_requirements', 'visa_rule_sources',
    'verification_logs', 'visa_rule_versions', 'profiles', 'saved_trips',
    'trip_checklists', 'subscriptions', 'admin_audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create trigger countries_updated_at before update on public.countries
for each row execute function public.set_updated_at();
create trigger data_sources_updated_at before update on public.data_sources
for each row execute function public.set_updated_at();
create trigger visa_requirements_updated_at before update on public.visa_requirements
for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger saved_trips_updated_at before update on public.saved_trips
for each row execute function public.set_updated_at();
create trigger trip_checklists_updated_at before update on public.trip_checklists
for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();

create policy "Supported countries are publicly readable"
on public.countries for select to anon, authenticated using (true);
create policy "Administrators manage countries"
on public.countries for all to authenticated
using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "Editorial roles read visa rules"
on public.visa_rules for select to authenticated
using (public.has_role('reviewer') or public.has_role('publisher') or public.has_role('admin'));
create policy "Only current non-conflicted published rules are publicly readable"
on public.visa_rules for select to anon, authenticated
using (
  verification_status = 'published'
  and not conflict_flag
  and next_review_at is not null
  and next_review_at >= now()
);
create policy "Reviewers create draft visa rules"
on public.visa_rules for insert to authenticated
with check ((public.has_role('reviewer') or public.has_role('admin')) and verification_status = 'draft');
create policy "Editorial roles update visa rules"
on public.visa_rules for update to authenticated
using (public.has_role('reviewer') or public.has_role('publisher') or public.has_role('admin'))
with check (public.has_role('reviewer') or public.has_role('publisher') or public.has_role('admin'));
create policy "Administrators delete visa rules"
on public.visa_rules for delete to authenticated using (public.has_role('admin'));

create policy "Sources for public rules are readable"
on public.data_sources for select to anon, authenticated
using ((source_type <> 'licensed_provider' or may_display) and exists (
  select 1 from public.visa_rule_sources link
  join public.visa_rules rule on rule.id = link.visa_rule_id
  where link.data_source_id = data_sources.id
    and rule.verification_status = 'published'
    and not rule.conflict_flag
    and rule.next_review_at is not null
    and rule.next_review_at >= now()
));
create policy "Editorial roles manage sources"
on public.data_sources for all to authenticated
using (public.has_role('reviewer') or public.has_role('admin'))
with check (public.has_role('reviewer') or public.has_role('admin'));

create policy "Requirements of published rules are publicly readable"
on public.visa_requirements for select to anon, authenticated
using (exists (
  select 1 from public.visa_rules rule
  where rule.id = visa_rule_id and rule.verification_status = 'published'
    and not rule.conflict_flag and rule.next_review_at is not null and rule.next_review_at >= now()
));
create policy "Editorial roles manage requirements"
on public.visa_requirements for all to authenticated
using (public.has_role('reviewer') or public.has_role('admin'))
with check (public.has_role('reviewer') or public.has_role('admin'));

create policy "Sources attached to published rules are publicly readable"
on public.visa_rule_sources for select to anon, authenticated
using (exists (
  select 1 from public.visa_rules rule
  where rule.id = visa_rule_id and rule.verification_status = 'published'
    and not rule.conflict_flag and rule.next_review_at is not null and rule.next_review_at >= now()
));
create policy "Editorial roles manage rule sources"
on public.visa_rule_sources for all to authenticated
using (public.has_role('reviewer') or public.has_role('admin'))
with check (public.has_role('reviewer') or public.has_role('admin'));

create policy "Reviewers read verification history"
on public.verification_logs for select to authenticated
using (public.has_role('reviewer') or public.has_role('publisher') or public.has_role('admin'));
create policy "Reviewers append verification history"
on public.verification_logs for insert to authenticated
with check ((public.has_role('reviewer') or public.has_role('admin')) and reviewer_id = auth.uid());

create or replace function public.review_visa_rule(
  target_rule_id uuid,
  review_outcome text,
  verification_method text,
  review_notes text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  previous_data jsonb;
  updated_data jsonb;
  sources_data jsonb;
  resulting_status text;
begin
  if not (public.has_role('reviewer') or public.has_role('admin')) then
    raise exception 'Reviewer permission is required.';
  end if;
  if review_outcome is null or review_outcome not in ('approved', 'rejected', 'needs_changes', 'conflict') then
    raise exception 'Unsupported review outcome.';
  end if;
  if verification_method is null or length(trim(verification_method)) = 0 then
    raise exception 'Verification method is required.';
  end if;

  select to_jsonb(rule) into previous_data
  from public.visa_rules rule
  where rule.id = target_rule_id
    and rule.verification_status in ('pending_review', 'verified');
  if previous_data is null then
    raise exception 'Rule is not available for review.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'sourceId', source.id,
    'sourceName', source.source_name,
    'sourceUrl', source.source_url
  )), '[]'::jsonb)
  into sources_data
  from public.visa_rule_sources link
  join public.data_sources source on source.id = link.data_source_id
  where link.visa_rule_id = target_rule_id;

  resulting_status := case
    when review_outcome = 'approved' then 'verified'
    when review_outcome = 'conflict' then 'stale'
    else 'draft'
  end;
  update public.visa_rules
  set verification_status = resulting_status,
      source_checked_at = case when resulting_status = 'verified' then now() else source_checked_at end,
      conflict_flag = (review_outcome = 'conflict'),
      conflict_notes = case when review_outcome = 'conflict' then review_notes else null end
  where id = target_rule_id
  returning to_jsonb(visa_rules) into updated_data;

  insert into public.verification_logs (
    visa_rule_id, reviewer_id, verification_method, source_references,
    review_outcome, change_summary, previous_version, new_version, notes
  ) values (
    target_rule_id, auth.uid(), trim(verification_method), sources_data,
    review_outcome, 'Review outcome: ' || review_outcome, previous_data, updated_data, review_notes
  );
end;
$$;
revoke all on function public.review_visa_rule(uuid, text, text, text) from public, anon;
grant execute on function public.review_visa_rule(uuid, text, text, text) to authenticated;

create or replace function public.mark_stale_visa_rules()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  perform set_config('visacompass.stale_sweep', 'on', true);
  update public.visa_rules
  set verification_status = 'stale'
  where verification_status = 'published'
    and (next_review_at is null or next_review_at <= now());
  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;
revoke all on function public.mark_stale_visa_rules() from public, anon, authenticated;
grant execute on function public.mark_stale_visa_rules() to service_role;

create policy "Editorial roles read rule versions"
on public.visa_rule_versions for select to authenticated
using (public.has_role('reviewer') or public.has_role('publisher') or public.has_role('admin'));

create policy "Users read own profile"
on public.profiles for select to authenticated using (id = auth.uid());
create policy "Users update own profile"
on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy "Users manage own trips"
on public.saved_trips for select to authenticated using (user_id = auth.uid());
create policy "Users create first free trip or premium trips"
on public.saved_trips for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    public.has_premium_entitlement()
    or not exists (select 1 from public.saved_trips own_trip where own_trip.user_id = auth.uid())
  )
);
create policy "Users update own trips"
on public.saved_trips for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete own trips"
on public.saved_trips for delete to authenticated using (user_id = auth.uid());

create or replace function public.enforce_saved_trip_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Trips must belong to the authenticated user.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if not public.has_premium_entitlement()
    and exists (select 1 from public.saved_trips trip where trip.user_id = new.user_id) then
    raise exception 'Free accounts can save one trip; premium entitlement is required for multiple trips.';
  end if;
  return new;
end;
$$;
create trigger saved_trip_entitlement_guard
before insert on public.saved_trips
for each row execute function public.enforce_saved_trip_entitlement();

create policy "Users manage checklists for own trips"
on public.trip_checklists for all to authenticated
using (exists (
  select 1 from public.saved_trips trip
  where trip.id = saved_trip_id and trip.user_id = auth.uid()
))
with check (exists (
  select 1 from public.saved_trips trip
  where trip.id = saved_trip_id and trip.user_id = auth.uid()
) and (
  visa_requirement_id is null
  or exists (
    select 1
    from public.visa_requirements requirement
    join public.visa_rules rule on rule.id = requirement.visa_rule_id
    join public.saved_trips trip on trip.id = trip_checklists.saved_trip_id
    where requirement.id = trip_checklists.visa_requirement_id
      and rule.origin_country_id = trip.origin_country_id
      and rule.destination_country_id = trip.destination_country_id
      and rule.travel_purpose = trip.travel_purpose
      and rule.passport_type = trip.passport_type
      and rule.verification_status in ('published', 'stale')
  )
));

create policy "Users read own subscription"
on public.subscriptions for select to authenticated using (user_id = auth.uid());
create policy "Administrators read subscriptions"
on public.subscriptions for select to authenticated using (public.has_role('admin'));

create policy "Administrators read audit logs"
on public.admin_audit_logs for select to authenticated using (public.has_role('admin'));
create policy "Administrators append audit logs"
on public.admin_audit_logs for insert to authenticated with check (public.has_role('admin'));

grant select on public.countries to anon, authenticated;
grant insert, update, delete on public.countries to authenticated;
grant select, insert, update, delete on public.data_sources to authenticated;
grant select on public.data_sources to anon;
grant select, insert, update, delete on public.visa_rules to authenticated;
grant select on public.visa_rules to anon;
grant select, insert, update, delete on public.visa_requirements to authenticated;
grant select on public.visa_requirements to anon;
grant select, insert, update, delete on public.visa_rule_sources to authenticated;
grant select on public.visa_rule_sources to anon;
grant select, insert on public.verification_logs to authenticated;
grant select on public.visa_rule_versions to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.saved_trips to authenticated;
grant select, insert, update, delete on public.trip_checklists to authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert on public.admin_audit_logs to authenticated;

create view public.public_visa_assessments with (security_barrier = true) as
select
  rule.id,
  rule.origin_country_id,
  rule.destination_country_id,
  rule.passport_type,
  rule.travel_purpose,
  case
    when rule.conflict_flag then 'conflicted'
    when rule.verification_status = 'stale'
      or rule.next_review_at is null
      or rule.next_review_at < now() then 'stale'
    else 'verified'
  end as assessment_status,
  case
    when rule.conflict_flag or rule.verification_status = 'stale'
      or rule.next_review_at is null or rule.next_review_at < now() then 'unknown'
    else rule.entry_pathway
  end as entry_pathway,
  case
    when rule.conflict_flag or rule.verification_status = 'stale'
      or rule.next_review_at is null or rule.next_review_at < now() then '{}'::text[]
    else rule.eligibility_conditions
  end as eligibility_conditions,
  case
    when rule.conflict_flag or rule.verification_status = 'stale'
      or rule.next_review_at is null or rule.next_review_at < now() then null
    else rule.maximum_stay_days
  end as maximum_stay_days,
  case
    when rule.conflict_flag or rule.verification_status = 'stale'
      or rule.next_review_at is null or rule.next_review_at < now() then null
    else rule.application_url
  end as application_url,
  case
    when rule.conflict_flag or rule.verification_status = 'stale'
      or rule.next_review_at is null or rule.next_review_at < now() then null
    else rule.verified_fee_amount
  end as verified_fee_amount,
  case
    when rule.conflict_flag or rule.verification_status = 'stale'
      or rule.next_review_at is null or rule.next_review_at < now() then null
    else rule.verified_fee_currency
  end as verified_fee_currency,
  case
    when rule.conflict_flag or rule.verification_status = 'stale'
      or rule.next_review_at is null or rule.next_review_at < now() then null
    else rule.processing_information
  end as processing_information,
  rule.effective_from,
  rule.effective_until,
  rule.source_checked_at,
  rule.next_review_at,
  rule.conflict_flag
from public.visa_rules rule
where rule.verification_status in ('published', 'stale');

revoke select on public.visa_rules from anon, authenticated;
grant select on public.visa_rules to anon, authenticated;
grant select on public.public_visa_assessments to anon, authenticated;
