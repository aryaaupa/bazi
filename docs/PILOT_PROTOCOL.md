# Bazi Pilot v1 — Retrospective Validation Protocol

## Purpose

Evaluate whether Bazi can identify a pre-specified disengagement event early enough to support a future care-team intervention, using retrospective governed data only.

This protocol is intentionally designed for a first external validation and should be finalized with the pilot partner before any analysis is run.

## 1. Freeze the clinical/operational endpoint

The partner and Bazi team must define one primary disengagement event before model evaluation.

Examples:

- no qualifying activity for N consecutive days
- failure to complete at least Y of Z expected sessions
- withdrawal from a digital care program
- program-specific adherence failure defined by the clinical team

Do not change the primary endpoint after examining held-out performance.

## 2. Freeze the prediction horizon

Choose one primary horizon, for example 3, 7, or 14 days before disengagement.

Secondary horizons may be exploratory, but must be labeled as such.

## 3. Observation window

Document exactly which prior data are available to a prediction. Example: the six most recent expected sessions or the prior 30 days of telemetry.

No feature may use information occurring after the prediction timestamp.

## 4. Preferred input signals

Prefer objectively recorded product telemetry over subjective proxy scores whenever available:

- expected session completion / non-completion
- time since last activity
- session cadence
- session duration
- response latency
- notification response
- task/module completion
- sequence adherence
- rescheduling behavior
- program-specific engagement events

Subjective fatigue, difficulty, or engagement ratings may be included only when their collection process is documented and they are genuinely available at prediction time.

## 5. Cohort definition

Document:

- inclusion criteria
- exclusion criteria
- cohort dates
- minimum observation history
- site/program/product version
- number of unique participants
- number of positive disengagement events
- censoring rules
- missing-data rules

Split data by participant, not by individual event, to avoid leakage across train/test partitions.

## 6. Model governance

For formal evaluation:

- freeze model weights before opening the held-out cohort
- record model version and SHA-256 hash
- freeze feature definitions and preprocessing
- freeze alert threshold(s)
- record software commit SHA
- keep test labels hidden from model development when possible

The current public synthetic model is a reference artifact only and must not be represented as clinically validated.

## 7. Primary metrics

Report at minimum:

- AUROC with 95% confidence interval
- AUPRC with 95% confidence interval
- calibration plot / calibration error
- sensitivity at the locked threshold
- specificity at the locked threshold
- positive predictive value
- negative predictive value
- median and distribution of useful lead time
- false alerts per patient-week

Where repeated predictions occur for the same participant, confidence intervals should account for participant-level clustering or use participant-level bootstrap resampling.

## 8. Subgroup analysis

Pre-specify clinically relevant or operationally relevant subgroups when sample size permits. Avoid over-interpreting small subgroups.

For each subgroup, inspect:

- discrimination
- calibration
- false-alert burden
- missingness / coverage

## 9. Intervention policy

No retrospective analysis should imply that an alert itself is a treatment recommendation.

Before a prospective intervention study, create a provider-reviewed action library with:

- allowed action
- minimum / maximum risk range
- whether provider approval is required
- contraindications
- escalation path
- stop conditions
- version identifier

## 10. Pilot stages

### Stage A — Retrospective validation

No effect on care. Historical de-identified or appropriately governed data only.

### Stage B — Silent prospective validation

Predictions are generated prospectively but hidden from treating staff and do not alter care.

### Stage C — Controlled intervention study

Only after clinical, privacy, security, regulatory, and IRB/quality-improvement determinations are complete as applicable.

## 11. Success criteria for Pilot v1

The partner and Bazi team should agree on go/no-go criteria before analysis. Example categories:

- sufficient lead time to be operationally useful
- acceptable false-alert burden
- adequate calibration
- stable performance across the main target population
- clear path to a silent prospective validation

No single universal threshold is assumed; the acceptable operating point is workflow-specific.

## 12. Deliverables

- locked protocol
- data dictionary and provenance summary
- model artifact manifest
- evaluation notebook/script output
- metric table with confidence intervals
- calibration analysis
- subgroup analysis
- error analysis
- limitations
- recommendation for next study stage
