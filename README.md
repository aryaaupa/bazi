# Bazi

**Adaptive engagement intelligence for software-based care.**

Bazi is an early-stage research and product platform designed to detect deterioration in patient engagement before full disengagement or dropout, then route a bounded, provider-approved response through an auditable decision layer.

> **Current status:** research/product alpha. The current demonstration model is based on synthetic trajectories and is **not clinically validated**. Use synthetic or properly de-identified data only. Do not represent this repository as HIPAA compliant, a medical device, or ready for autonomous treatment decisions.

## The problem

Digital care programs often recognize disengagement only after missed sessions, declining adherence, or dropout. Bazi treats disengagement as a longitudinal trajectory rather than a single endpoint.

The research question is:

> Can observable behavioral signals predict a pre-specified disengagement event with enough lead time and acceptable false-alert burden to support a clinically appropriate intervention?

## Product loop

`patient/app events → feature computation → disengagement-risk model → policy layer → provider-approved action → auditable outcome record`

The current alpha supports:

- multi-patient longitudinal event streams
- patient-relative feature computation
- risk scoring from current patient state
- organization-specific intervention policies
- provider approval / dismissal gates
- decision and audit persistence
- Supabase Auth + Postgres + row-level security integration
- a deterministic, state-grounded Copilot interface
- local sandbox mode for demos using synthetic data

## Safety boundary

Bazi is intentionally constrained to engagement decision support.

It does **not**:

- diagnose a patient
- prescribe treatment
- autonomously change a treatment plan
- replace a clinician
- claim that the current risk score is a clinically validated probability

Moderate/high-risk actions should be limited to a pre-approved action library and routed through human review when required.

## Pilot v1 strategy

The next milestone is not a patient-facing deployment. It is a **retrospective, de-identified validation pilot**.

A pilot partner should be able to provide a governed historical cohort containing observable engagement events and a pre-defined outcome label. Bazi should then be evaluated on held-out participants using a frozen model artifact and a locked protocol.

Primary evaluation targets:

- AUROC
- AUPRC
- calibration
- sensitivity / specificity at a locked threshold
- prediction lead time
- false alerts / interventions per patient-week
- subgroup performance and confidence intervals

See [`docs/PILOT_PROTOCOL.md`](docs/PILOT_PROTOCOL.md) and [`pilot/README.md`](pilot/README.md).

## Pilot endpoint must be frozen before analysis

Before accepting partner data, define:

1. **Disengagement event** — e.g. no activity for N days, failure to complete Y of Z expected sessions, or a program-specific operational endpoint.
2. **Prediction horizon** — e.g. 3, 7, or 14 days before the event.
3. **Observation window** — which prior events are available to the model.
4. **Alert threshold** — frozen before evaluation on the held-out cohort.
5. **Permitted actions** — provider-reviewed, versioned, and bounded.

## Data principles

For the first external validation:

- prefer de-identified or aggregated retrospective data
- avoid PHI in this public repository
- do not place partner datasets, secrets, production credentials, or proprietary model artifacts in GitHub
- separate identifiers from model features whenever possible
- record data provenance, schema version, cohort definition, exclusions, and preprocessing

## Repository architecture

- `app.html` — provider-facing alpha workspace
- `bazi-platform.js` — current product state, storage, risk and policy flow
- `supabase-schema.sql` — organization / patient / event / decision data model and RLS
- `SUPABASE_SETUP.md` — authenticated development backend setup
- `pilot/` — retrospective validation harness and frozen reference model
- `docs/PILOT_PROTOCOL.md` — clinical/research validation protocol template
- `docs/SECURITY_AND_GOVERNANCE.md` — pilot security and governance checklist

## Local demo

Open `app.html` from a static server or GitHub Pages. Local mode uses synthetic patients and browser storage.

For authenticated development mode, configure a dedicated Supabase project using [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md). Never expose a Supabase `service_role` key client-side.

## What is real vs. what is not

### Real in the current alpha

- working multi-patient product flow
- event ingestion
- computed longitudinal features
- policy-gated recommendations
- provider approval state
- persisted decision records
- Supabase integration path

### Not yet established

- clinical validity
- generalization to a real patient population
- calibrated clinical probability estimates
- prospective utility
- reduction in disengagement
- safety of intervention policies in a real care workflow
- HIPAA compliance or production security certification

## Recommended deployment progression

1. **Demo / customer discovery** — synthetic data only.
2. **Retrospective validation** — de-identified historical cohort; no clinical action.
3. **Silent prospective validation** — predictions generated without affecting care.
4. **Controlled intervention study** — only after governance, clinical review, and an approved protocol.
5. **Production deployment** — only after security/privacy, regulatory, clinical, and contractual requirements are independently addressed.

## Public-repository rule

This repository is suitable for a sanitized demo and research scaffold. Any partner-specific integration, proprietary dataset, production infrastructure, PHI, secrets, or non-public model artifact should live in an appropriately controlled private environment.
