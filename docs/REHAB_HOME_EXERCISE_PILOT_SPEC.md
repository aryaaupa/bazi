# Bazi | Rehabilitation and Home Exercise Adherence Pilot Specification
**2026-10-08 · Dell Med demonstration · synthetic-only implementation**

## Decision and boundaries
The selected first workflow is outpatient rehabilitation home-exercise participation. Bazi observes participation patterns; it does not prescribe exercises, diagnose conditions, determine clinical recovery, assess pain severity, triage emergencies, or autonomously modify care. The original temporal-order control `BAZI-W1-TEMPORAL-FAIL-848d87bf0f6369a1` remains **FAILED**; release decision **DO NOT PROCEED** for final benchmarking. No locked benchmark, seed, model fit, or definitions may change as part of this product work.

## Exact current demo architecture
```
/patient/ (synthetic participant, BZ-001)
  -> rehabEvent(values) [presentation mapper, no model change]
  -> Workspace.ingestBatch() [existing event schema validation]
  -> browser localStorage STORAGE_KEY
  -> Workspace.evaluate() [existing synthetic engagement signal]
  -> /app/#patient/BZ-001 [same browser origin, clinician view]
  -> provider reviews / modifies / approves engagement support
  -> shared localStorage -> /patient/ approved-support panel
```
A cross-tab storage event refreshes the other perspective. A separate device, browser profile or hospital workstation **does not** share this data. No real messages are delivered. The current demo is not PHI-safe.

### Contract
One event: `patient_id`, `occurred_at` (ISO UTC), `status` (completed/shortened/late/skipped), `duration_minutes` (0–180; skipped = 0), `engagement` (0–100), `fatigue` (low/medium/high), `difficulty` (appropriate/too-easy/too-hard), `quality` (0–1). In this demo, 'engagement' is a self-reported manageability proxy and must **not** be represented as validated exercise adherence or a clinical measurement. Do not reinterpret historical synthetic behavioral-health records as real rehabilitation data. The rehab UI contextualizes a fictional record; generated baseline events were not produced from a rehabilitation-specific data-generating process.

Descriptive participation = (completed + shortened + late) / all observed participation statuses. This is **not** prescribed exercise adherence: the denominator lacks actual prescribed sessions, repetitions, dose and clinician-defined acceptable completion.

## Proposed production architecture — NOT IMPLEMENTED
1. Patient app with OIDC identity, consent and accessibility; verified assignment to a rehab care plan.
2. EHR/rehab platform integration through institution-approved SMART-on-FHIR/FHIR endpoints or a vendor event adapter. Resources to scope include Patient, Practitioner, CarePlan, Task, Observation and Communication; confirm available versions and profiles with Dell.
3. API gateway -> authenticated event ingestion -> schema/version validation -> idempotency and provenance -> tenant-isolated encrypted clinical event store.
4. Append-only event audit, correction/retraction workflow, timestamps in UTC with source timezone, RBAC and clinician attribution.
5. Versioned feature computation and separately validated engagement models, with abstention on insufficient data, calibration/monitoring and no automatic patient contact.
6. Clinician review queue inside approved workflow; approved support -> audited communications service with consent, preferences, delivery and opt-out.
7. Analytics pipeline for pre-specified adherence and workflow endpoints; segregated research dataset and approvals. Monitoring, incident response, retention and deletion policies.
8. Security, privacy, legal, clinical safety, accessibility and governance sign-offs before any PHI or patient access.

## Clinical workflow
- Therapist prescribes an approved home exercise plan with scheduled opportunities and clinician-defined adherence rules.
- Patient records completion, partial completion, skipped session, minutes, fatigue and perceived difficulty; exercise-specific dosing remains future integration work.
- Clinician reviews participation history and observation provenance, not a diagnosis or acute risk score.
- When evidence is sufficient and an approved policy identifies a potential participation concern, clinician can review, defer, dismiss, modify or approve a nonclinical supportive check-in.
- The support is delivered only by an approved clinical communication channel in a future production system; the demo only renders a local synthetic representation.
- Patient records a subsequent session; team evaluates adherence and burden under a pre-registered protocol.

## Product acceptance criteria — synthetic demo
AC01: Patient route loads with visible synthetic-only disclaimer and rehab terminology.
AC02: Patient saves completed, partial, late and skipped sessions; skipped duration is 0.
AC03: Invalid duration/status/engagement is rejected; no event written.
AC04: Patient activity appears as an identical timestamped observation in clinician record after navigation and cross-tab refresh.
AC05: Clinician can inspect event status, duration, fatigue, difficulty and quality in the timeline.
AC06: Clinician decision remains provider-controlled; no unapproved action appears as approved patient support.
AC07: After a permitted approval, patient panel shows the approved action as *simulated*, not delivered.
AC08: No network transfer of patient data is required or represented in the demo; separate-device synchronization is explicitly unsupported.
AC09: Refresh retains state in same browser; browser storage unavailable is clearly disclosed.
AC10: Mobile widths 375/768/1440, keyboard timeline interaction, accessible labels, contrast and focus states are tested.
AC11: Existing model and benchmark definitions are unchanged; temporal-order control remains failed.
AC12: Public build includes /patient/ and module imports; no private data, secrets or production integration claims.

## End-to-end test plan
Automated: `npm run check && npm test && npm run build`. Contract tests for rehabEvent, skipped=0, invalid duration, summary denominators, and Workspace.ingestBatch -> new Workspace same storage. Regression tests for existing clinician review state.
Browser: Chromium clean profile, load /patient/, submit each status, refresh, inspect /app/#patient/BZ-001, filter timeline, select last observation by pointer and Enter/Space, evaluate and approve when permitted, return to patient and confirm support panel; repeat with two tabs, test offline cache, mobile viewport, storage blocked, invalid input and no approval. Record screenshots, console errors, and exact build SHA. Do not claim tests passed unless executed.

## Dell Med questions / pilot gate
- Clinical sponsor: which rehab service line and therapist owns support decisions?
- Prescription source: where do scheduled exercises, frequency and acceptable completion criteria originate?
- Integration owner: EHR team, home-exercise vendor or remote therapeutic monitoring program?
- Data governance: research vs QI determination, HIPAA responsibilities, security review, consent and data retention?
- Validation: retrospective labels independent of simulator, participant-level split, subgroup checks, leakage controls, negative controls and prospective silent evaluation?
- Economics: therapist minutes per flagged patient, avoidable review workload, completion rate, patient burden and potential reimbursement constraints?

**Meeting ask:** identify one clinical champion, one informatics/data counterpart, a candidate workflow/data source and an approved feasibility-scoping process. Not immediate live deployment.
