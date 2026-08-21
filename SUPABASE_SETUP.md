# Bazi Alpha — Supabase Setup

Bazi ships in **local development mode** by default so `app.html` works immediately on GitHub Pages. To turn on the authenticated multi-user backend, connect a dedicated Supabase development project.

> This repository is a research/product Alpha. Use synthetic or properly de-identified data only until independent security, privacy, legal, and clinical review is complete. Do not represent this build as HIPAA compliant or clinically validated.

## 1. Create a dedicated Supabase development project

Create a new project. In Project Settings / API, copy:

- the project URL
- the browser-safe publishable/anon key

**Never expose the `service_role` key in GitHub Pages or browser code.**

## 2. Apply the database files in this order

Run these in the Supabase SQL editor:

1. `supabase-schema.sql`
2. `supabase-hardening.sql`
3. `supabase-bootstrap.sql`

The schema provides organizations, memberships, patients, timestamped patient events, organization-specific intervention policies, model decisions, and RLS. The hardening migration adds tenant-integrity checks, immutable model provenance fields, and removes browser DELETE access from event/decision audit data.

## 3. Create the first provider account

Create a test provider user in Supabase Authentication with email/password.

After that user signs in, initialize one workspace by calling the authenticated RPC:

```sql
select public.bootstrap_bazi_workspace('Bazi Founding Design Partner');
```

The function is limited to authenticated users and returns the user's existing organization if one already exists. On first use it creates the organization, owner membership, and the default provider-reviewed intervention policy set.

If you prefer to bootstrap only from the SQL editor, you may still create the organization and membership manually.

## 4. Connect the browser app

Edit `bazi-config.js` with the browser-safe values:

```js
window.BAZI_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_BROWSER_SAFE_PUBLISHABLE_KEY',
  organizationId: 'YOUR_ORG_UUID',
  mode: 'supabase'
};
```

The Supabase publishable/anon key is designed for client applications; authorization must come from RLS, not from treating that key as a secret.

After deployment, `app.html` shows a provider sign-in gate. Auth sessions persist through Supabase Auth. The app loads only data allowed by the logged-in user's organization membership and RLS policies.

## 5. Model behavior

The provider app now loads `pilot/model-artifact.js` before `bazi-platform.js`. That means the working UI uses the **frozen synthetic reference artifact** rather than retraining a model on every page load.

The frozen artifact remains a software-plumbing/reference model only. It is not clinically validated and must be replaced by a governed model artifact before any external performance claim.

## 6. Add synthetic or de-identified pilot data

Sign in, add a patient, and ingest session events. The current product loop is:

`event → feature computation → frozen risk model → policy match → recommendation → decision record`

High/moderate-risk recommendations remain pending until a provider explicitly approves or dismisses them.

## 7. What is real in this Alpha

- Supabase Auth sign-in flow
- multi-tenant Postgres schema
- organization membership roles
- RLS-based tenant isolation
- patient/event storage
- frozen model execution in the provider UI
- provider-reviewed policy layer
- approval/dismissal workflow
- persistent decision/audit records
- retrospective validation harness in `pilot/`
- deterministic state-grounded Copilot

## 8. What is deliberately not claimed

The current reference model is derived from synthetic trajectories, so its output is not a clinically validated probability. Before real patient-facing deployment, Bazi still requires governed real-world validation, independent security/privacy review, applicable BAA/legal work, threat modeling, accessibility testing, incident-response planning, and clinical/regulatory determination.

For the first external collaboration, use the staged plan in `docs/PILOT_PROTOCOL.md`: retrospective validation first, then silent prospective validation, then only a controlled intervention study after the appropriate approvals.
