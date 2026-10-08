# Dell Med Demo — Deployment and Evidence Readiness Audit (2026-10-08)

## Release decision
**NOT READY FOR REAL PATIENT IMPLEMENTATION.** The GitHub Pages app is a synthetic, browser-local demonstration, not a secure multi-user clinical system. The Phase 4.6A temporal-order control remains FAILED (BAZI-W1-TEMPORAL-FAIL-848d87bf0f6369a1). **DO NOT PROCEED** with final benchmarking, model refits, seed changes, or locked-definition changes.

## Verified by source inspection
- Two UI entry points: /app/ clinician and /patient/ patient companion.
- Both instantiate the same Workspace class and use the same localStorage key on one browser origin.
- Patient form uses validated ingestBatch; clinician timeline uses workspace.events and assessment.
- Clinician approvals are represented in local synthetic state; patient UI displays an approved action, not a delivered message.
- Static GitHub Pages build allowlists /patient/, /app/, assets, model and SDK files.
- No real authentication, role isolation, tenant segregation, server database, EHR/FHIR integration, PHI processing agreement, secure message delivery, clinician identity verification, consent management, or production audit guarantees are established by this repo review.
- Offline service worker had a stale cache version and did not precache /patient/. Fixed in hardening PR.
- Cross-tab perspectives did not automatically refresh after writes; added storage listeners in hardening PR.

## P0 before any real patient pilot
1. Identify clinical service line, supervising clinical owner, patient population, consent and approved use.
2. Institutional security, privacy, legal, clinical safety and IRB/quality-improvement determination; BAA where applicable.
3. Replace browser-local demo state with authenticated, authorized, tenant-isolated backend and encrypted transport/storage; clinical audit and access controls.
4. Define validated data contracts, patient identity matching, integration pathway (FHIR/HL7/EHR or approved DTx event interface), timestamp semantics and provenance.
5. Clinical escalation policy, alert ownership, action approval and messaging, human override, fail-safe behavior, monitoring and rollback.
6. Independent validation with a locked protocol and clean benchmark; original failed temporal-order experiment must remain failed and visible.

## P1 before the Oct 22 synthetic stakeholder demo
- Test build, unit tests, browser flows in Chromium on desktop/mobile, keyboard access, navigation and persistence.
- Test patient activity -> clinician timeline and assessment -> clinician approval -> patient support view in the same browser and separate tabs.
- Confirm network/offline service-worker behavior after deploy, hard refresh and private-window launch.
- Test negative cases: insufficient evidence, invalid inputs, skipped duration, disabled protocol, no approved action, storage denied.
- Prepare a 5-minute synthetic demo, architecture/data-flow diagram, proposed pilot design, and explicit limitation slide.

## Pilot proposal
Start with workflow discovery and retrospective de-identified evaluation under approved institutional governance. Only after adequate performance and safety evidence consider silent prospective evaluation, then a clinician-supervised controlled pilot. Do not promise immediate clinical deployment.

## Attendee questions to prepare
- Nilay Shah: Who buys, owns, staffs and pays for the workflow? What is the economic value and smallest adoptable pilot?
- Jim Buntrock: Data provenance, governance, security, EHR integration, identity, FHIR mapping, hosting, model monitoring and interoperability.
- Hongfang Liu: Cohort design, label leakage, data simulation circularity, temporal control failure, prospective validation, uncertainty, subgroup performance, clinical generalizability.
