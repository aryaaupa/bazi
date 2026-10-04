import '../../pilot/model-artifact.js';

export const MODEL = globalThis.BAZI_FROZEN_MODEL;
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const sigmoid = value => 1 / (1 + Math.exp(-value));
const deviation = values => Math.sqrt(mean(values.map(value => (value - mean(values)) ** 2)));
function slope(values) {
  if (values.length < 2) return 0;
  const mx = (values.length - 1) / 2, my = mean(values);
  const denominator = values.reduce((total, _, index) => total + (index - mx) ** 2, 0);
  return values.reduce((total, value, index) => total + (index - mx) * (value - my), 0) / denominator;
}

export const FEATURE_LABELS = [
  'Missed sessions', 'Session duration', 'Reported fatigue', 'Reported difficulty',
  'Engagement trend', 'Average engagement', 'Engagement variation', 'Late sessions'
];

export function computeFeatures(patient, events) {
  const window = [...events].sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at)).slice(-MODEL.observationWindowEvents);
  const recent = window.filter(event => (event.quality ?? 1) >= 0.6);
  const completed = recent.filter(event => event.status !== 'skipped');
  const engagement = recent.map(event => event.engagement);
  const n = Math.max(recent.length, 1);
  return {
    missedRate: recent.filter(event => event.status === 'skipped').length / n,
    durationRatio: clamp(mean(completed.map(event => event.duration_minutes)) / patient.baseline_duration, 0, 1.5),
    fatigueHighRate: recent.filter(event => event.fatigue === 'high').length / n,
    tooHardRate: recent.filter(event => event.difficulty === 'too-hard').length / n,
    engagementSlope: slope(engagement),
    engagementMean: mean(engagement),
    volatility: deviation(engagement),
    lateRate: recent.filter(event => event.status === 'late').length / n,
    observedCount: recent.length,
    coverage: window.length ? recent.length / window.length : 0,
    windowCount: window.length
  };
}

export function vector(features) {
  return [features.missedRate, features.durationRatio, features.fatigueHighRate, features.tooHardRate,
    features.engagementSlope / 20, features.engagementMean / 100, features.volatility / 25, features.lateRate];
}

export function scoreFeatures(features) {
  const linear = vector(features).reduce((total, value, index) => total + value * MODEL.weights[index], MODEL.bias);
  return { score: sigmoid(linear), linear, modelVersion: MODEL.version };
}

export function assess(patient, events, threshold = MODEL.defaultThreshold) {
  const features = computeFeatures(patient, events);
  const available = features.observedCount >= 3 && features.coverage >= 0.6;
  const prediction = scoreFeatures(features);
  const thresholdAdjustment = available ? 0.08 * (1 - Math.min(features.observedCount, 6) / 6) + 0.12 * (1 - features.coverage) : 0;
  const effectiveThreshold = Math.min(0.95, threshold + thresholdAdjustment);
  const baselineFeatures = computeFeatures(patient, events.slice(0, 6));
  const currentVector = vector(features), baselineVector = vector(baselineFeatures);
  const contributions = FEATURE_LABELS.map((label, index) => ({
    label, index, value: currentVector[index], baseline: baselineVector[index],
    delta: (currentVector[index] - baselineVector[index]) * MODEL.weights[index],
    counterfactualScore: sigmoid(prediction.linear - (currentVector[index] - baselineVector[index]) * MODEL.weights[index])
  })).sort((a, b) => b.delta - a.delta);
  return {
    ...prediction, features, available, contributions, baseThreshold: threshold, effectiveThreshold, thresholdAdjustment,
    band: !available ? 'unavailable' : prediction.score >= effectiveThreshold ? 'elevated' : prediction.score >= 0.4 ? 'watch' : 'stable',
    evidence: !available ? 'Insufficient observations' : features.observedCount < 6 ? 'Limited history' : features.coverage < 1 ? 'Partial coverage' : 'Full recent window',
    uncertainty: 'Clinical uncertainty is unquantified; this model has synthetic provenance only.'
  };
}

export function validateEvent(event) {
  if (!event || !Number.isFinite(Date.parse(event.occurred_at)) || !/^\d{4}-\d{2}-\d{2}T/.test(event.occurred_at)) throw new Error('Event time must be an ISO timestamp.');
  if (!['completed', 'shortened', 'late', 'skipped'].includes(event.status)) throw new Error('Unknown session status.');
  if (!Number.isFinite(event.duration_minutes) || event.duration_minutes < 0 || event.duration_minutes > 180) throw new Error('Duration must be between 0 and 180 minutes.');
  if (!Number.isFinite(event.engagement) || event.engagement < 0 || event.engagement > 100) throw new Error('Engagement must be between 0 and 100.');
  if (!['low', 'medium', 'high'].includes(event.fatigue)) throw new Error('Fatigue must be low, medium, or high.');
  if (!['appropriate', 'too-easy', 'too-hard'].includes(event.difficulty)) throw new Error('Unknown difficulty value.');
  if (!Number.isFinite(event.quality ?? 1) || (event.quality ?? 1) < 0 || (event.quality ?? 1) > 1) throw new Error('Quality must be between 0 and 1.');
  if (event.status === 'skipped' && event.duration_minutes !== 0) throw new Error('A skipped session must have zero duration.');
  return event;
}

export async function fingerprint(value) {
  const data = new TextEncoder().encode(JSON.stringify(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
