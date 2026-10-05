# Bazi — Engagement Intelligence

Bazi is a research-alpha engagement intelligence product for digital-care teams. The public repository contains a deterministic synthetic demo, provider-controlled review workflow, benchmark environment, public interfaces, and documentation. It does **not** contain a production clinical system or establish clinical validity.

The product loop is:

`observed session events → longitudinal features → frozen risk model → action policy → provider review → recorded follow-up`

The public demo works without backend credentials, external fonts, or a login flow. It generates a reproducible cohort of **500 synthetic participants, 18,000 events, nine behavioral archetypes, and 12-week trajectories**. Model scores and dashboard metrics are computed from those events.

## Run and verify

```sh
npm run check
npm test
npm run build
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080/` for the website and `/app/` for the workspace. Serve over HTTP rather than opening HTML as a file. The build needs Node 20 or later, with no npm dependencies.

## What works

- Six primary sections: Overview, Patients, Interventions, Outcomes, Validation, and Governance. Study configuration, audit, and integrations are secondary.
- Overview begins with the live review count and an attention table; patient pages center the 12-week trajectory, event chronology, and provider decision.
- Live event-by-event simulation and validated single-event or transactional CSV ingestion.
- Patient-relative behavioral changes, observed vs. unobserved timelines, measured warning windows, evidence-adjusted review thresholds, and optional baseline sensitivity exploration.
- Provider approve, modify, dismiss-with-reason, and 48-hour snooze workflows.
- Protocol shutoff, duplicate suppression, and an intervention observation window.
- Approval-anchored seven-day follow-ups, computed duration/engagement/completion changes, and recorded responder, nonresponder, dismissal, snooze, and no-action cases.
- Calculated synthetic AUROC, AUPRC, calibration, threshold trade-offs, subgroups, feature drift, and participant bootstrap intervals.
- Pilot Configuration with downloadable draft protocol and configuration.
- Model fingerprint, browser-held hash-chained audit log, CSV/JSON exports, and refresh persistence.
- Integration contracts and explicitly illustrative FHIR resource exports.
- Service-worker fallback after an online load; relative URLs work on repository subpaths or a custom domain.

## Canonical application architecture

| Path | Role |
| --- | --- |
| `index.html`, `assets/website.*` | Public website and computed product preview |
| `app/index.html`, `assets/workspace-ui.js`, `assets/workspace.css` | Unified clinical workspace |
| `packages/engagement/model.js` | Pure longitudinal feature and scoring functions |
| `pilot/model-artifact.js` | Single frozen model artifact shared with retained legacy tooling |
| `packages/engagement/cohort.js` | Deterministic event generator and endpoint-based evaluation |
| `packages/engagement/interpretation.js` | Observed explanations, retrospective warning intervals, and anchored outcome metrics |
| `packages/engagement/workspace.js` | Patient state, event ingestion, review policy, follow-up, persistence and audit |
| `sdk/src/validation.js` | Existing SDK evaluation, subgroup, bootstrap and drift implementation |
| `sdk/` | Retained engagement SDK, security abstractions, tests, and research evidence |
| `scripts/build.mjs` | Allowlisted deployment packaging; excludes backend configuration and SQL |
| `.github/workflows/pages.yml` | Checks, tests, build and GitHub Pages deployment |

The public product has one canonical implementation: `assets/website.css`, `assets/website.js`, `assets/workspace.css`, `assets/workspace-ui.js`, `packages/engagement/`, `sdk/src/validation.js`, and `docs/`.

## Public demo / private core boundary

This repository is the public demo surface. It should remain polished, deterministic, synthetic, and safe to inspect. Proprietary production work belongs behind a narrow interface in a separate private core, including production risk/model implementations, feature engineering, policy-learning mechanisms, benchmark-generation internals used for final research claims, partner-specific configurations, signed production artifacts, production API/backend, tenant/auth/security infrastructure, audit infrastructure, partner data adapters, deployment tooling, and partner integrations.

Moving implementation private does not erase prior public disclosure. Repository history is preserved intentionally; do not rewrite history to imply earlier material was never public. Patent-sensitive scope should be reviewed with counsel before further disclosure.

## Evidence and safety boundary

The frozen model has **synthetic provenance and no clinical validation**. Scores are not calibrated clinical dropout probabilities. Generated outcomes do not demonstrate intervention effectiveness, fairness, or patient benefit.

The workspace has no real clinician authentication or external patient outreach. The synthetic provider role, local browser persistence, and hash chain are demonstration controls, not production access control or an immutable audit service. FHIR exports are mapping examples; no EHR connection or public webhook API is deployed.

No diagnosis, prescription, autonomous treatment change, HIPAA-compliance claim, or production clinical readiness is implied. Use synthetic data only in the public workspace.

The existing authenticated Supabase schema and SDK consent, encryption, authorization, retention and signed-package scaffolds are retained for separate governed development. The public demo does not initialize that backend or expose its configuration.

## Validation pathway

Synthetic demonstration → governed retrospective validation → silent prospective validation → controlled provider-reviewed engagement study → independently reviewed production deployment.

Before any external evaluation, freeze the endpoint, prediction horizon, observation window, feature preparation, threshold, model, participant splits, allowed actions and stopping rules. No tuning on the held-out cohort. Real datasets, secrets, or proprietary artifacts do not belong in this public repository.

## Demo and publication

- [Visual direction, image assets, and font provenance](docs/VISUAL_DIRECTION.md)
- [Six-minute demo runbook](docs/DEMO_RUNBOOK.md)
- [Publishing and custom-domain setup](docs/PUBLISHING_AND_DOMAIN.md)
- [Retrospective pilot protocol](docs/PILOT_PROTOCOL.md)
- [Security and governance scaffold](docs/SECURITY_AND_GOVERNANCE.md)
- [SDK documentation](sdk/README.md)

The GitHub Pages workflow publishes `dist/` from `main`. If the cofounder already owns `bazi.com`, connect it using the exact DNS records and GitHub Pages steps in the publishing guide. Domain-account access is still needed to configure and verify it.
