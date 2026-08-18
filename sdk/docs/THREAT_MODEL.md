# Engineering threat model

Assessment date: 2026-08-18  
Method: data-flow review plus STRIDE-style threat enumeration  
Scope: SDK ingestion, derived features, model/config package, local policy, provider approval, persistence, audit/incident sinks, and host identity boundary  
Status: internal engineering assessment complete; independent penetration test is not complete.

## Assets and trust boundaries

Protected assets are subject-linked derived telemetry, consent records, decisions, model/config integrity, provider approvals, encryption/signing keys, audit records, and availability of the `no_action` safety path. Raw samples are sensitive even though they are short-lived.

Trust boundaries exist between endpoint sensors and host app, host identity provider and SDK, SDK and persistence, SDK and action executor, build/signing environment and deployed package, and local audit/incident buffers and organization sinks.

## Risk register

| ID | Threat | Initial risk | Repository controls | Residual work |
|---|---|---:|---|---|
| T1 | Forged user/provider identity or privilege escalation | High | `HostAuthorizer`, explicit permissions, authenticated-session path | Integrate OIDC/FIDO/session expiry; negative authorization tests in host app |
| T2 | Telemetry injection, schema smuggling, or replay | High | Allowlisted finite metrics, unknown-field rejection, bounded ephemeral buffer | Add host attestation/replay nonce where threat model requires; rate limits |
| T3 | Plaintext or swapped persisted state | High | AES-256-GCM wrapper, random IV, storage-key AAD | Platform keystore/HSM, rotation, backup encryption, rollback counter |
| T4 | Modified model/config/action rules | Critical | Ed25519 signatures, canonical payload, verified runtime factory, immutable manifest | Protect offline signing key, pin public key, enforce monotonic versions and revocation |
| T5 | Contraindicated or over-burdensome action | Critical | Provider manifest, deny rules, discomfort mask, cooldown/budget gates, `no_action`, approval state | Real provider review, hazard analysis, host executor allowlist, usability validation |
| T6 | Raw telemetry leakage | High | Consume in `finally`, no raw persistence field, privacy status tests | Inspect host logs/crash analytics/network SDKs; endpoint memory test |
| T7 | Linkage through identifiers or logs | High | Subject key omitted from audit deletion event; derived audit payload | Use deployment pseudonyms; sink minimization, access logging, deletion across backups |
| T8 | Consent bypass or stale consent | High | Purpose/version/expiry/revocation enforcement before ingest | Approved UX/text, re-consent rules, external system reconciliation |
| T9 | Denial of service or resource exhaustion | Medium | Bounded raw/decision/audit collections, retention | Host rate limits, watchdog, storage quota handling, load/fault testing |
| T10 | Poisoned rewards or drift | High | Confounded/incomplete outcome censoring; drift monitor | Outcome provenance, anomaly review, no automatic model update in production |
| T11 | Audit deletion/tampering | High | Structured append interface and external sink option | Immutable remote sink, clock integrity, retention/legal-hold policy, alerting |
| T12 | Endpoint compromise or malicious action executor | Critical | SDK sends an allowlisted action identifier only | Mobile/desktop hardening, code signing, sandboxing, MDM where applicable |

## Abuse cases tested in the repository

- Unknown telemetry is rejected.
- Raw samples are consumed after derived-feature extraction, including exceptions.
- Unauthorized or unconsented ingestion is rejected.
- A modified signed package is rejected.
- A frozen action library cannot be mutated or extended.
- Contraindications remove actions but never `no_action`.
- Rejected or incomplete outcomes do not train the policy.
- Retention removes expired decisions; subject deletion removes consent and decisions.

## Security release gates

Do not ship until the host app demonstrates identity lifecycle, session expiry, least privilege, platform key custody, encrypted backup handling, signed-package anti-rollback, dependency/SBOM review, vulnerability intake and patch SLAs, monitored incident response, recovery testing, independent penetration testing, and verification on each supported endpoint. If the product is a regulated medical device, align cybersecurity documentation with current FDA guidance and the quality system.
