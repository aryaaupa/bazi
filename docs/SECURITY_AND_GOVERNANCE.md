# Bazi Pilot Security & Governance Checklist

This checklist is for retrospective and silent-prospective research pilots. It is not a certification of HIPAA compliance.

## Data boundary
- Use synthetic, de-identified, or otherwise appropriately governed data for Pilot v1.
- Do not commit partner datasets, PHI, API secrets, private keys, credentials, or production model artifacts to this public repository.
- Define the minimum necessary data fields before transfer.
- Document data owner, lawful/approved use, retention period, deletion process, and access list.

## Environment
- Use a dedicated private pilot environment per partner or a formally isolated multi-tenant environment.
- Require authenticated users; no anonymous access to pilot data.
- Enforce organization-level row-level security.
- Use HTTPS/TLS for all network traffic.
- Keep service-role credentials server-side only.
- Maintain separate development, pilot, and production credentials.

## Access control
- Roles: owner/admin/provider/viewer.
- Least privilege by default.
- Verify cross-organization access is impossible.
- Verify viewers cannot create or approve decisions.
- Verify providers can only act on patients in authorized organizations.
- Remove access immediately when a user leaves a pilot.

## Auditability
For every model decision record:
- patient/pseudonymous identifier
- event cutoff timestamp
- model version
- model artifact hash
- feature schema version
- prediction horizon
- risk score
- threshold/policy version
- top contributing signals
- recommendation
- approval/dismissal status
- actor and timestamp

Avoid destructive deletion of decision history during a governed pilot. Corrections should append or supersede with provenance.

## Model governance
- Train outside the browser for formal validation.
- Freeze model artifact before held-out evaluation.
- Store model manifest, training-data provenance summary, preprocessing version, and hash.
- Do not retrain on the held-out cohort.
- Do not silently change thresholds during the study.

## Threat-model minimums
Test at least:
- cross-tenant data access
- broken object-level authorization
- unauthorized decision approval
- session hijacking / stale sessions
- exposed secrets in browser bundles
- CSV/formula injection in imported data
- malformed or adversarial input
- replayed events / duplicate ingestion
- audit-log tampering
- excessive export permissions

## Clinical boundary
- Bazi does not diagnose or prescribe.
- Engagement interventions must be provider-reviewed and versioned.
- Define contraindications and escalation conditions.
- For silent prospective validation, predictions must not alter care.

## Before real PHI or patient-facing use
Obtain appropriate independent security/privacy/legal review and determine applicable contractual, BAA, IRB/QI, regulatory, accessibility, incident-response, retention, and breach-notification obligations.
