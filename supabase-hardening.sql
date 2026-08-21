-- Bazi Pilot Alpha hardening migration
-- Run AFTER supabase-schema.sql in a dedicated development/pilot project.
-- This improves tenant integrity and auditability. It is not a certification of HIPAA compliance.

-- Extra model provenance fields for audit records.
alter table public.model_decisions
  add column if not exists feature_schema_version text,
  add column if not exists model_artifact_hash text,
  add column if not exists prediction_horizon_days integer,
  add column if not exists policy_version text;

-- Enforce that patient references always belong to the same organization.
create or replace function public.enforce_patient_org_match()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.patients p
    where p.id = new.patient_id
      and p.organization_id = new.organization_id
  ) then
    raise exception 'patient_id does not belong to organization_id';
  end if;
  return new;
end;
$$;

drop trigger if exists patient_events_org_match on public.patient_events;
create trigger patient_events_org_match
before insert or update of organization_id, patient_id on public.patient_events
for each row execute function public.enforce_patient_org_match();

drop trigger if exists model_decisions_org_match on public.model_decisions;
create trigger model_decisions_org_match
before insert or update of organization_id, patient_id on public.model_decisions
for each row execute function public.enforce_patient_org_match();

-- Model records are append-mostly: only provider disposition fields may change.
create or replace function public.protect_model_decision_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.organization_id is distinct from new.organization_id
     or old.patient_id is distinct from new.patient_id
     or old.model_version is distinct from new.model_version
     or old.risk is distinct from new.risk
     or old.confidence is distinct from new.confidence
     or old.features is distinct from new.features
     or old.top_signals is distinct from new.top_signals
     or old.policy_id is distinct from new.policy_id
     or old.recommendation is distinct from new.recommendation
     or old.requires_approval is distinct from new.requires_approval
     or old.source is distinct from new.source
     or old.created_by is distinct from new.created_by
     or old.created_at is distinct from new.created_at
     or old.feature_schema_version is distinct from new.feature_schema_version
     or old.model_artifact_hash is distinct from new.model_artifact_hash
     or old.prediction_horizon_days is distinct from new.prediction_horizon_days
     or old.policy_version is distinct from new.policy_version
  then
    raise exception 'immutable model decision fields cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_model_decision_record on public.model_decisions;
create trigger protect_model_decision_record
before update on public.model_decisions
for each row execute function public.protect_model_decision_record();

-- Replace broad FOR ALL policies on event/decision audit tables with least-privilege policies.
drop policy if exists "providers can manage events" on public.patient_events;
create policy "providers can insert events" on public.patient_events
for insert to authenticated
with check (public.is_org_provider(organization_id));
create policy "providers can update events" on public.patient_events
for update to authenticated
using (public.is_org_provider(organization_id))
with check (public.is_org_provider(organization_id));

-- No authenticated DELETE policy for patient_events.
revoke delete on public.patient_events from authenticated;

drop policy if exists "providers can manage decisions" on public.model_decisions;
create policy "providers can insert decisions" on public.model_decisions
for insert to authenticated
with check (public.is_org_provider(organization_id));
create policy "providers can update decision disposition" on public.model_decisions
for update to authenticated
using (public.is_org_provider(organization_id))
with check (public.is_org_provider(organization_id));

-- No authenticated DELETE policy for model_decisions.
revoke delete on public.model_decisions from authenticated;

-- Membership management is restricted to owners/admins.
create policy "admins can add memberships" on public.organization_members
for insert to authenticated
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_members.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
);
create policy "admins can update memberships" on public.organization_members
for update to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_members.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_members.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  )
);

-- Keep deletes off memberships in the browser for the research alpha; manage removals through a controlled admin path.
revoke delete on public.organization_members from authenticated;
