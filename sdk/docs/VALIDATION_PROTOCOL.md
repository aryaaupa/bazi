# Locked model-validation protocol

Protocol version: 1.0.0  
Outcome version: `disengagement-v1.0.0`  
Status: ready for prospective approval; no participant results are present in this repository.

## Primary endpoint and prediction horizon

At a prespecified decision time `t0`, predict whether a disengagement event occurs during `(t0, t0 + 120 seconds]`. A positive endpoint is the first of:

1. `premature_task_exit`: the participant exits an active required task before its protocol-defined completion, excluding provider-ended, safety-ended, or scheduled-stop events.
2. `omission_plus_30s_inactivity`: a required response window closes without a response and is followed by at least 30 continuous seconds without protocol-qualified interaction.
3. `active_task_30s_inactivity`: at least 30 continuous seconds without protocol-qualified interaction while an active task expects interaction, excluding declared breaks, loading, connectivity loss, and provider holds.
4. `failure_to_resume_30s`: after a scheduled break or acknowledged prompt ends, no protocol-qualified interaction occurs within 30 seconds.

The outcome is `1` when a qualifying event is observed inside the horizon, even if later follow-up is lost. It is `0` only after the full 120-second horizon is observed without a qualifying event. It is censored (`null`) when observation ends before the horizon without a positive event. The event-generation pipeline must create these composite, adjudicated event types; a raw tap gap or page close alone is insufficient.

## Study design

- Freeze the outcome definition, feature code, model weights, threshold, subgroup list, and analysis plan before evaluation.
- Use participant-disjoint development and held-out sets. No session from a held-out participant may influence feature design, imputation, normalization, model fitting, threshold selection, or calibration fitting.
- Prefer a prospective silent-mode held-out study so interventions do not alter the outcome being predicted. If intervention-exposed sessions are included, prespecify causal handling and report them separately.
- Record a stable participant pseudonym, decision timestamp, probability, label/censoring, and non-overlapping monitored exposure milliseconds.
- Adjudicators should be blinded to model probability when manual adjudication is required. Report inter-rater agreement and resolution rules.
- Analyze one locked primary threshold. Exploratory thresholds must be labeled exploratory.

## Required input

Use JSON or JSON Lines matching `schemas/held-out-prediction.schema.json`. Every row must have `split: "held_out"`. `monitoredMs` is non-overlapping eligible monitoring exposure attributed to that decision row; overlapping windows must be collapsed or apportioned before calculating false interventions per hour.

```bash
npm run validate:model -- --input /path/to/held-out.jsonl --output evidence/model-validation.json --threshold 0.65 --subgroup ageBand --iterations 5000
```

## Locked metrics

- Calibration: reliability bins, expected calibration error, and Brier score. Plot observed rate against mean predicted probability with participant-bootstrap uncertainty.
- Classification: sensitivity, specificity, precision, negative predictive value, and confusion counts at the locked threshold.
- Operational burden: false interventions per monitored hour = false-positive decisions / non-overlapping monitored hours.
- Discrimination: AUROC and AUPRC.
- Uncertainty: percentile confidence intervals from resampling whole participants, never individual rows. The default confidence level is 95%.
- Censoring: report counts and reasons. Censored rows are excluded from binary metrics but never silently removed from the flow diagram.

## Subgroups

Prespecify clinically and operationally justified groups before unblinding, including supported device/OS, site, age band, disability/access-needs categories collected with consent, sex/gender where justified, task type, and sensor-availability strata. Do not publish identifiable small cells. Set a minimum participant count and event count before estimating a subgroup metric; otherwise report “insufficient evidence.” Compare uncertainty and calibration, not only point estimates.

## Acceptance gates to complete before data lock

The clinical owner must set numerical lower confidence bounds for specificity, sensitivity, and AUPRC; an upper bound for false interventions/hour and calibration error; maximum acceptable subgroup gaps; and drift response thresholds. The repository intentionally does not invent these values because acceptability depends on intended use, harm severity, workflow, and prevalence.
