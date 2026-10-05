# Bazi public/core contract

Status: **Phase 1 — boundary definition.** The private production core is not yet established by this repository.

This contract defines what the public synthetic reference environment may depend on once a private core becomes canonical. The public demo must remain runnable without access to private source code, credentials, partner data, or production model artifacts.

## Public reference surface

The public repository may contain:

- deterministic synthetic patient/session records and demo-safe fixtures;
- deliberately simplified reference feature computation and synthetic reference weights;
- provider-controlled review state and UI behavior;
- public schemas and SDK examples;
- representative synthetic benchmark outputs and validation utilities;
- safety, evidence-boundary, governance, and pilot documentation.

These implementations are reference mechanisms for inspectability and demonstration. They are not the canonical production engine.

## Private canonical surface

New production-worthy work should live in the private core, including:

- production feature engineering and fitted/trained model artifacts;
- policy learning and selection mechanisms;
- benchmark-hardening internals and final research execution pipelines;
- partner-specific endpoints, mappings, cohort definitions, and configurations;
- production evaluation and monitoring;
- partner data adapters and integration credentials;
- tenant authentication/authorization and production audit infrastructure;
- signed production configuration/model artifacts;
- backend services, deployment configuration, and partner integrations.

## Versioned interface

The public demo should consume only stable, documented shapes rather than private implementation details.

### Engagement assessment

Input:

```json
{
  "schema_version": "bazi.engagement.v1",
  "subject_id": "synthetic-or-partner-scoped-id",
  "as_of": "RFC3339 timestamp",
  "observations": []
}
```

Output:

```json
{
  "schema_version": "bazi.engagement.v1",
  "status": "stable|watch|review|insufficient_data",
  "signal": 0.0,
  "threshold": 0.0,
  "observed_changes": [],
  "evidence_quality": "sufficient|insufficient",
  "model_version": "opaque-version",
  "explanation": {
    "summary": "human-readable observed-change summary",
    "contributors": []
  }
}
```

The contract does not require disclosure of production features, weights, training code, policy internals, or partner-specific transformations.

### Provider decision

```json
{
  "schema_version": "bazi.review.v1",
  "assessment_id": "opaque-id",
  "decision": "approve|modify|dismiss|snooze",
  "reason": "structured-or-null",
  "provider_actor": "partner-scoped-id",
  "recorded_at": "RFC3339 timestamp"
}
```

No contract operation may autonomously modify treatment. Provider authority remains external to the engagement signal.

### Follow-up observation

```json
{
  "schema_version": "bazi.followup.v1",
  "assessment_id": "opaque-id",
  "decision_id": "opaque-id",
  "window_start": "RFC3339 timestamp",
  "window_end": "RFC3339 timestamp",
  "observations": []
}
```

The public demo may implement these contracts locally with synthetic reference code. A private production implementation may satisfy the same contract without exposing its internal mechanism.

## Dependency rule

The intended dependency direction is:

`public UI / public SDK -> versioned contract -> implementation`

Never:

`public UI -> private internal module paths`

The public repository must not require cloning, vendoring, submoduling, or building private source code to run the Dell-facing synthetic demo.

## Migration rule

Creating the private core is a forward-looking separation, not an attempt to erase public history. Existing public mechanisms remain disclosed. When a production mechanism diverges from the reference implementation, do not back-port proprietary details merely to keep the public reference implementation behaviorally identical.

## Promotion checklist

The split may be called complete only when all of the following are true:

1. A private core repository exists with restricted visibility.
2. New production model/policy work is canonical there.
3. Public/private interfaces are versioned and documented.
4. The public demo runs independently using synthetic/reference implementations.
5. Production artifacts, partner definitions, credentials, adapters, and deployment configuration are absent from the public repository.
6. CI prevents accidental publication of private-core artifacts.
7. Documentation clearly distinguishes synthetic reference behavior from production behavior.
8. Git history has not been rewritten to obscure prior disclosure.
