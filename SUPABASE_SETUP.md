# Bazi Alpha — Supabase Setup

Bazi ships in **local development mode** by default so `app.html` works immediately on GitHub Pages. To turn on the authenticated multi-user backend, connect a dedicated Supabase development project.

> This repository is a research/product Alpha. Use synthetic or properly de-identified data only until independent security, privacy, legal, and clinical review is complete. Do not represent this build as HIPAA compliant or clinically validated.

## 1. Create a development Supabase project

Create a new project. In Project Settings / API, copy the project URL and the browser-safe publishable/anon key.

**Never expose the `service_role` key in GitHub Pages or any browser code.**

## 2. Create the database

Open the Supabase SQL editor and run `supabase-schema.sql`.

That creates:

- organizations
- organization memberships with `owner`, `admin`, `provider`, and `viewer` roles
- patients
- timestamped patient events
- organization-specific intervention policies
- immutable-style model decision records
- row-level-security policies tied to organization membership

## 3. Create your first provider user

Create a test user through Supabase Authentication using an email and password. Copy the user's UUID.

Then bootstrap a development organization in the SQL editor, replacing `YOUR_AUTH_USER_UUID`:

```sql
insert into public.organizations (name)
values ('Bazi Founding Design Partner')
returning id;
```

Copy the returned organization UUID, then run:

```sql
insert into public.organization_members (organization_id, user_id, role)
values ('YOUR_ORG_UUID', 'YOUR_AUTH_USER_UUID', 'owner');

insert into public.intervention_policies
  (organization_id, name, min_risk, max_risk, recommendation, requires_approval)
values
  ('YOUR_ORG_UUID', 'Monitor', 0, 39, 'Continue current plan and monitor.', false),
  ('YOUR_ORG_UUID', 'Engagement friction', 40, 69, 'Reduce non-clinical friction: adjust reminder timing and request a brief engagement check-in.', true),
  ('YOUR_ORG_UUID', 'Provider review', 70, 100, 'Escalate for provider review before any treatment-plan change.', true);
```

## 4. Connect the browser app

Edit `bazi-config.js`:

```js
window.BAZI_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_BROWSER_SAFE_KEY',
  organizationId: 'YOUR_ORG_UUID',
  mode: 'supabase'
};
```

After deployment, `app.html` will show a provider sign-in gate. Auth sessions persist through Supabase Auth. The app automatically loads only the organization, patients, events, policies, and decisions permitted by RLS.

## 5. Add synthetic patients and events

Sign in, add a patient, then ingest session events. Each event triggers the real Bazi Alpha loop:

`event → feature computation → risk model → policy match → recommendation → decision record`

High/moderate-risk recommendations remain pending until a provider explicitly approves or dismisses them.

## What is real in this Alpha

- multi-patient event storage
- longitudinal feature computation
- trained in-browser logistic regression model
- risk probability generated from current patient events
- organization-specific policy constraints
- provider approval gate
- decision/audit persistence
- state-aware Copilot answers
- Supabase Auth + Postgres + RLS integration path

## What is deliberately not claimed

The current model is trained on seeded **synthetic trajectories**, so its output is not a clinically validated probability. The current Copilot is deterministic and grounded in Bazi state rather than an unrestricted LLM. Before any real clinical deployment, move model execution behind controlled server infrastructure, validate on governed real-world data, complete threat modeling/security testing, establish privacy/BAA requirements where applicable, and complete clinical/regulatory review.
