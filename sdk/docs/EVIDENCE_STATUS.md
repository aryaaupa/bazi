# Evidence and release status

Status date: 2026-08-18. This file distinguishes implemented controls from evidence that requires real participants, target devices, named reviewers, or production infrastructure.

| Area | Repository result | Status | Release gate |
|---|---|---:|---|
| Disengagement outcome | Versioned 120-second event contract and censoring logic in `src/outcomes.js` | Implemented and unit-tested | Protocol owner must approve the definition before data lock |
| Held-out validation | Participant-level metrics, calibration bins/ECE, Brier score, specificity, false interventions/hour, AUROC, AUPRC, and cluster-bootstrap confidence intervals | Tooling implemented and unit-tested | No actual participant dataset supplied; no performance claim may be made |
| Subgroup analysis | Grouped metric reports; participant IDs retained for clustered uncertainty | Tooling implemented | Prespecify groups, minimum sample sizes, multiplicity policy, and acceptance bounds |
| Drift | PSI and standardized mean-shift monitor | Tooling implemented and unit-tested | Establish approved reference distribution and alert/action thresholds |
| Provider action library | Immutable manifest, review metadata requirements, contraindication masking, and guaranteed `no_action` | Enforcement implemented | `config/action-manifest.pending.json` is deliberately unapproved; named provider sign-off required |
| Authentication/authorization | Host identity-verification adapter and role-permission enforcement | Implemented and unit-tested | Integrate and test the deployment identity provider; SDK contains no password store |
| Encrypted persistence | AES-256-GCM storage wrapper with per-record random IV and key-bound additional authenticated data | Implemented and unit-tested | Platform keystore/HSM key custody, rotation, recovery, and backup policy required |
| Consent | Versioned purpose-limited grant, expiry, revocation, persistence, and deletion | Implemented and unit-tested | Approved consent text and deployment workflow required |
| Retention/deletion | Decision TTL, persisted-state expiry, and subject deletion | Implemented and unit-tested | Organization must set and approve retention values and verify all external sinks/backups |
| Incident logging | Structured severity/category/component records and optional sink | Implemented and unit-tested | Connect to monitored immutable logging and approve response/escalation runbook |
| Signed model/config | Ed25519 sign/verify tools and verified SDK factory | Implemented and unit-tested | Offline key custody, two-person release approval, rollback protection, and signed approved package required |
| Threat modeling | Engineering threat model and risk register in `THREAT_MODEL.md` | Completed internally | Independent security review and penetration testing remain open |
| Accessibility | Static smoke checks for the browser example | Passed on 2026-08-18 | Manual WCAG 2.2 AA, screen-reader, zoom, keyboard, cognitive-load, and target-app testing remain open |
| Device performance | Reproducible latency/memory/CPU/energy harness | Implemented; reference container run recorded | Named supported device/OS matrix and external energy measurements remain open |
| Clinical/regulatory | Internal screening packet and reviewer form | Prepared, not independently reviewed | Qualified independent clinical and regulatory reviewers must sign before pilot/release |

## Claim boundary

The repository supports engineering and study execution. It does **not** establish clinical safety, effectiveness, FDA status, HIPAA compliance, accessibility conformance, or real-world model performance. A pending template or synthetic fixture is never evidence of approval or validation.
