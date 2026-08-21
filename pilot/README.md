# Bazi Pilot v1 Validation Harness

This directory is for retrospective, de-identified evaluation. It is deliberately separate from the public demo product flow.

## Why this exists

The current alpha product trains a synthetic demonstration model in-browser. Formal partner validation should instead use a frozen model artifact, a locked feature schema, a fixed endpoint, a fixed prediction horizon, and held-out participant-level evaluation.

`model-artifact.js` is only a frozen **synthetic reference artifact** so the plumbing can be tested without runtime retraining. Replace it with a governed model artifact before any external performance claim.

## Expected cohort CSV

One row per prediction opportunity, with at least:

```text
participant_id,label,missedRate,durationRatio,fatigueHighRate,tooHardRate,engagementSlopeScaled,engagementMeanScaled,volatilityScaled,lateRate,patient_weeks,lead_time_days
```

Where:

- `label` is 1 if the pre-specified disengagement event occurs inside the locked horizon, otherwise 0.
- features must use information available at or before the prediction timestamp.
- `patient_weeks` is the exposure represented by the row or aggregation and is used to estimate false alerts per patient-week.
- `lead_time_days` is optional and should only be populated for true-positive warnings when a meaningful event time exists.

## Governance rules

- split by participant, never random event rows from the same person across train/test
- do not tune the threshold on the held-out cohort
- do not commit partner CSVs to this public repo
- record cohort definition and exclusions
- record model version and hash
- record software commit SHA
- bootstrap by participant when estimating confidence intervals

## Minimum report

- cohort N / event prevalence
- AUROC
- AUPRC
- sensitivity
- specificity
- PPV / NPV
- calibration by risk decile
- false alerts per patient-week
- useful lead-time distribution
- subgroup/error analysis

See `../docs/PILOT_PROTOCOL.md` before using external data.
