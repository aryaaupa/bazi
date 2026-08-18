# Bazi Engagement SDK

The Bazi SDK is a dependency-free research and integration SDK for predicting a versioned near-term disengagement event and selecting only provider-permitted engagement interventions.

It is designed for therapeutic-software prototypes, validation studies, and controlled pilots. It is **not a medical device, clinically validated model, diagnostic system, treatment recommendation engine, or statement of HIPAA compliance**.

## Architecture

The SDK implements a two-stage control system:

1. A rolling feature extractor converts validated endpoint telemetry into derived features and immediately consumes the raw sample.
2. A risk model estimates disengagement probability and uncertainty.
3. An eligibility manager decides whether an intervention may occur using risk, uncertainty, fatigue, monotony, recent burden, sensor validity, cooldown, and session budget.
4. An action registry constructs the provider-permitted action set and always includes `no_action`.
5. A local LinUCB policy selects only from the permitted set.
6. Approval-gated actions do not execute until `approve()` is called.
7. A delayed outcome evaluator rejects incomplete/confounded observations and updates only the selected action when the observation is valid.
8. Audit records contain derived decision metadata, not raw telemetry.

## Quick start

```js
import { BaziEngagementSDK, LocalStorageAdapter } from './src/index.js';

const sdk = new BaziEngagementSDK({
  storage: new LocalStorageAdapter(),
  constraints: {
    allowedActionIds: ['no_action', 'encouragement', 'provider_review']
  },
  executor: async (action, decision) => {
    // Map the approved action ID to your application UI.
    return { delivered: true };
  }
});

sdk.startSession({ sessionId: 'session-123' });

const decision = await sdk.ingest({
  kind: 'touch',
  taskType: 'cognitive',
  quality: 0.96,
  metrics: {
    latencyMs: 420,
    pauseMs: 1800,
    engagementScore: 61,
    error: true,
    fatigue: 0.7
  }
});
```

At least three valid samples are required before the sensor-validity gate can open. Applications normally ingest continuously and call `decide()` at configured decision points instead of after every sample.

## Telemetry schema

```js
{
  timestamp: 1700000000000,       // optional; defaults to current time
  kind: 'touch',                  // required event category
  taskType: 'cognitive',          // optional protocol category
  quality: 0.95,                  // optional 0..1 sensor/observation quality
  metrics: {                      // required; supported fields only
    latencyMs: 320,
    pauseMs: 1400,
    cadence: 1.1,
    motionEnergy: 8.2,
    smoothness: 0.78,
    engagementScore: 74,
    error: false,
    fatigue: 0.4,
    difficulty: 0.5,
    completed: false
  }
}
```

Unknown fields are rejected so raw or sensitive data cannot silently enter the persistence path.

## Locked endpoint

The default outcome is `disengagement-v1.0.0`: a composite disengagement event during the 120 seconds after a decision. Its four qualifying composite events, 30-second inactivity criterion, exclusions, and censoring rules are locked in [the validation protocol](docs/VALIDATION_PROTOCOL.md) and implemented by `DisengagementDefinition`. Change the outcome version whenever semantics or timing changes.

## Held-out model validation

The validation command rejects rows that are not explicitly marked `split: "held_out"`. It reports calibration bins/ECE, Brier score, specificity, false interventions per hour, AUROC, AUPRC, and confidence intervals from resampling whole participants.

```bash
npm run validate:model -- --input held-out.jsonl --output evidence/model-validation.json --threshold 0.65 --subgroup deviceFamily --iterations 5000
```

No participant dataset is included, so the repository makes no performance claim. See `schemas/held-out-prediction.schema.json` and `docs/VALIDATION_PROTOCOL.md`.

## Supplying a validated model

The bundled logistic model is a research default only. A production or study deployment should supply independently validated weights:

```js
import { BaziEngagementSDK, LogisticRiskModel } from './src/index.js';

const model = new LogisticRiskModel({
  version: 'site-validated-2026-10',
  validated: true,
  bias: -1.2,
  weights: {
    latencyDeviation: 0.4,
    pauseRate: 1.0,
    cadenceDrift: 0.7,
    motionVariance: 0.2,
    smoothnessDrop: 0.5,
    engagementSlope: 0.8,
    errorRate: 1.1,
    fatigue: 0.6,
    monotony: 0.3,
    missingRate: 1.0
  }
});

const sdk = new BaziEngagementSDK({ riskModel: model, requireValidatedModel: true });
```

## Provider constraints and approval

```js
const sdk = new BaziEngagementSDK({
  constraints: {
    allowedActionIds: ['no_action', 'encouragement', 'micro_break', 'provider_review'],
    deniedActionIds: []
  }
});

const decision = await sdk.decide();
if (decision.status === 'pending_approval') {
  await sdk.approve(decision.id, 'provider-id');
  // or await sdk.reject(decision.id, 'provider-id');
}
```

Actions declaring `metadata.increasesIntensity: true` are automatically masked whenever session discomfort is above zero.

For a controlled release, use `FrozenActionManifest` with complete approved-provider review metadata. `config/action-manifest.pending.json` is deliberately non-loadable until a real reviewer completes it. Contraindications deny matching actions while `no_action` remains available. See `docs/ACTION_LIBRARY_REVIEW.md`.

## Authentication, consent, encryption, and deletion

Authentication delegates credential verification to the host identity system; the SDK does not store passwords or invent an identity protocol. `HostAuthorizer` maps verified roles to SDK permissions. With an authorizer configured, unauthenticated `startSession()` is disabled. `ConsentManager` enforces a versioned, purpose-limited, unexpired, non-revoked grant before ingestion.

Wrap persistence with `EncryptedStorageAdapter`, backed by a key held in the platform keystore or HSM:

```js
const encrypted = new EncryptedStorageAdapter(platformStorage, platformCryptoKey, { keyId: 'mobile-keystore-v3' });
const sdk = new BaziEngagementSDK({
  storage: encrypted,
  requireEncryptedStorage: true,
  authorizer,
  consentManager
});
await sdk.startAuthenticatedSession({ credential, subjectKey: deploymentPseudonym });
```

Decision and persisted-state TTLs are configurable. `deleteSubject()` removes the SDK's matching decisions, current derived state, and consent record. The host remains responsible for deletion from external audit/incident sinks, backups, exports, and upstream systems.

## Signed model and configuration releases

Ed25519 signatures cover the canonical JSON payload containing the locked validated model, configuration, and approved action manifest. The verified factory refuses an invalid signature, unvalidated model, incomplete package, unapproved manifest, untrusted key ID, or version rejected by the host's rollback policy.

```bash
npm run keys:generate -- release-key
npm run package:sign -- runtime-package.json release-key.private.jwk.json runtime-package.signed.json
npm run package:verify -- runtime-package.signed.json release-key.public.jwk.json
```

Generate keys in an offline controlled environment. Never commit private keys.

## Delayed outcomes

```js
const result = await sdk.observeOutcome(decision.id, {
  observationComplete: true,
  sensorValid: true,
  confounded: false,
  recoveryDelta: 0.35, // normalized -1..1
  completed: true,
  abandoned: false,
  dismissed: false
});
```

Incomplete, invalid, or confounded outcomes are censored and do not update the local policy.

## Privacy behavior

- Raw input exists only in a bounded ephemeral buffer.
- The sample is consumed in a `finally` block after derived-feature extraction.
- The in-memory feature window is not exported; only aggregate baselines, feature snapshots in decisions, model/policy parameters, action metadata, consent records, and audit fields can be persisted.
- `privacyStatus()` reports the current raw-record count.
- No network transport or federated-learning client is included. Those require a separately threat-modeled and authenticated implementation.

Plain browser storage is not automatically encrypted. A controlled deployment should enable `requireEncryptedStorage` and supply platform-appropriate key custody.

## API

| Method | Purpose |
|---|---|
| `startSession()` | Reset derived window and begin a session. |
| `startAuthenticatedSession()` | Verify the host credential and begin a subject-linked session. |
| `setDiscomfort(value, credential)` | Update normalized discomfort and action masking. |
| `updateConstraints(rules, actor)` | Replace the provider-authorized action allow/deny rules. |
| `setProtocolEnabled(value, actor)` | Enable or shut off intervention eligibility. |
| `registerAction(action, actor)` | Register an auditable action definition. |
| `ingest(sample, options)` | Validate, derive, consume raw sample, optionally decide. |
| `decide()` | Produce risk, gate, allowed actions, and selected action. |
| `approve(id, provider)` | Execute a pending approval-gated action. |
| `reject(id, provider)` | Reject a pending action. |
| `observeOutcome(id, outcome)` | Evaluate/censor reward and conditionally update policy. |
| `getDecision(id)` | Retrieve a defensive copy of a decision. |
| `listDecisions()` | List decision records. |
| `exportAudit()` | Export derived audit records. |
| `privacyStatus()` | Inspect raw-buffer status and policy. |
| `deleteSubject(subjectKey, credential)` | Remove matching SDK decisions, current state, and consent. |
| `save()` / `restore()` | Persist or restore derived state through an adapter. |
| `clear()` | Clear session, derived state, audit, and persistence. |

## Verification

```bash
cd sdk
npm test
npm run check
npm run benchmark
npm run benchmark:device
```

The tests cover input allowlisting, non-persistence of the sample window, outcome labeling/censoring, held-out metrics and clustered confidence intervals, drift, risk gating, cooldown, immutable action manifests, contraindications, authorization, consent, AES-GCM storage, Ed25519 packages, retention/deletion, approval, reward censoring, and persistence.

To regenerate the consolidated PDF, install the small Python report dependencies and run:

```bash
python -m pip install -r report-requirements.txt
npm run report
```

## Evidence package and release gates

- [Evidence status](docs/EVIDENCE_STATUS.md)
- [Validation protocol](docs/VALIDATION_PROTOCOL.md)
- [Provider action review](docs/ACTION_LIBRARY_REVIEW.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Accessibility report/protocol](docs/ACCESSIBILITY_TEST_REPORT.md)
- [Device test protocol](docs/DEVICE_TEST_PROTOCOL.md)
- [Clinical/regulatory review packet](docs/CLINICAL_REGULATORY_REVIEW_PACKET.md)
- [Ten scientific and hardware figures](docs/FIGURE_INDEX.md)

Do not claim clinical effectiveness, safety, anonymity, HIPAA compliance, accessibility conformance, or FDA status from this SDK alone. Items requiring real participants, target devices, a named provider, or independent reviewers remain explicit release gates rather than fabricated evidence.
