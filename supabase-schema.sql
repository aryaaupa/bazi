-- Bazi Alpha multi-tenant backend schema
-- Run in Supabase SQL editor for a NEW development project only.
-- Research / synthetic-data Alpha. Do not load PHI until security, legal, and clinical review are complete.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','provider','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_id text not null,
  display_name text not null,
  pathway text not null default 'Digital rehabilitation',
  baseline_duration numeric not null default 25,
  baseline_engagement numeric not null default 85,
  status text not null default 'monitoring',
  created_at timestamptz not null default now(),
  unique(organization_id,external_id)
);

create table if not exists public.patient_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  event_type text not null default 'session',
  status text check (status in ('completed','late','shortened','skipped')),
  duration_minutes numeric,
  fatigue text check (fatigue in ('low','medium','high')),
  difficulty text check (difficulty in ('easy','appropriate','too-hard')),
  engagement numeric check (engagement between 0 and 100),
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.intervention_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  min_risk integer not null check (min_risk between 0 and 100),
  max_risk integer not null check (max_risk between 0 and 100 and max_risk >= min_risk),
  recommendation text not null,
  requires_approval boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.model_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  model_version text not null,
  risk integer not null check (risk between 0 and 100),
  confidence integer not null check (confidence between 0 and 100),
  features jsonb not null,
  top_signals jsonb not null default '[]'::jsonb,
  policy_id uuid references public.intervention_policies(id),
  recommendation text not null,
  requires_approval boolean not null default true,
  status text not null default 'pending_provider' check (status in ('monitoring','pending_provider','provider_approved','dismissed')),
  source text not null default 'manual',
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_members_user on public.organization_members(user_id);
create index if not exists idx_patients_org on public.patients(organization_id);
create index if not exists idx_events_patient on public.patient_events(patient_id,occurred_at desc);
create index if not exists idx_events_org on public.patient_events(organization_id);
create index if not exists idx_decisions_patient on public.model_decisions(patient_id,created_at desc);
create index if not exists idx_decisions_org on public.model_decisions(organization_id);
create index if not exists idx_policies_org on public.intervention_policies(organization_id);

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_org_provider(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = (select auth.uid())
      and m.role in ('owner','admin','provider')
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.patients enable row level security;
alter table public.patient_events enable row level security;
alter table public.intervention_policies enable row level security;
alter table public.model_decisions enable row level security;

create policy "members can view organizations" on public.organizations
for select to authenticated
using (public.is_org_member(id));

create policy "members can view membership" on public.organization_members
for select to authenticated
using (public.is_org_member(organization_id));

create policy "members can view patients" on public.patients
for select to authenticated
using (public.is_org_member(organization_id));

create policy "providers can manage patients" on public.patients
for all to authenticated
using (public.is_org_provider(organization_id))
with check (public.is_org_provider(organization_id));

create policy "members can view events" on public.patient_events
for select to authenticated
using (public.is_org_member(organization_id));

create policy "providers can manage events" on public.patient_events
for all to authenticated
using (public.is_org_provider(organization_id))
with check (public.is_org_provider(organization_id));

create policy "members can view policies" on public.intervention_policies
for select to authenticated
using (public.is_org_member(organization_id));

create policy "admins can manage policies" on public.intervention_policies
for all to authenticated
using (exists(select 1 from public.organization_members m where m.organization_id=intervention_policies.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')))
with check (exists(select 1 from public.organization_members m where m.organization_id=intervention_policies.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));

create policy "members can view decisions" on public.model_decisions
for select to authenticated
using (public.is_org_member(organization_id));

create policy "providers can manage decisions" on public.model_decisions
for all to authenticated
using (public.is_org_provider(organization_id))
with check (public.is_org_provider(organization_id));

-- Recommended grants after RLS is enabled.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.organizations, public.organization_members, public.patients, public.patient_events, public.intervention_policies, public.model_decisions to authenticated;
grant execute on function public.is_org_member(uuid), public.is_org_provider(uuid) to authenticated;
