-- Bazi development workspace bootstrap
-- Run AFTER supabase-schema.sql in a dedicated development project.
-- This lets the first authenticated user create one isolated workspace without exposing service-role credentials in the browser.

create or replace function public.bootstrap_bazi_workspace(workspace_name text default 'Bazi Design Partner Sandbox')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  org_id uuid;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;

  select organization_id into org_id
  from public.organization_members
  where user_id = uid
  order by created_at
  limit 1;

  if org_id is not null then
    return org_id;
  end if;

  insert into public.organizations(name)
  values (coalesce(nullif(trim(workspace_name), ''), 'Bazi Workspace'))
  returning id into org_id;

  insert into public.organization_members(organization_id, user_id, role)
  values (org_id, uid, 'owner');

  insert into public.intervention_policies
    (organization_id, name, min_risk, max_risk, recommendation, requires_approval)
  values
    (org_id, 'Monitor', 0, 39, 'Continue current plan and monitor.', false),
    (org_id, 'Engagement friction', 40, 69, 'Reduce non-clinical friction: adjust reminder timing and request a brief engagement check-in.', true),
    (org_id, 'Provider review', 70, 100, 'Escalate for provider review before any treatment-plan change.', true);

  return org_id;
end;
$$;

revoke all on function public.bootstrap_bazi_workspace(text) from public;
grant execute on function public.bootstrap_bazi_workspace(text) to authenticated;
