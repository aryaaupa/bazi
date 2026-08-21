// Bazi Pilot v1 frozen REFERENCE artifact.
// IMPORTANT: coefficients below are derived from the synthetic alpha generator.
// This artifact exists to prevent runtime retraining during validation harness testing.
// It is NOT clinically validated and must be replaced by a governed, externally validated artifact before clinical use.

window.BAZI_FROZEN_MODEL = Object.freeze({
  name: 'bazi-risk-lr-synthetic-reference',
  version: 'pilot-ref-0.1.0',
  artifactClass: 'synthetic-reference-only',
  createdAt: '2026-08-21',
  predictionHorizonDays: 7,
  observationWindowEvents: 6,
  featureSchemaVersion: 'bazi-engagement-features-v1',
  features: [
    'missedRate',
    'durationRatio',
    'fatigueHighRate',
    'tooHardRate',
    'engagementSlopeScaled',
    'engagementMeanScaled',
    'volatilityScaled',
    'lateRate'
  ],
  // Fixed reference weights. Do not tune these against a held-out pilot cohort.
  weights: [3.0, -1.8, 1.75, 1.5, -1.9, -2.5, 1.125, 1.0],
  bias: -0.025,
  defaultThreshold: 0.70,
  provenance: {
    source: 'synthetic alpha latent-risk specification',
    intendedUse: 'software plumbing and retrospective validation harness testing only',
    clinicalValidation: false
  }
});
