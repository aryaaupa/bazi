import { clamp, mean } from './utils.js';
import { ValidationError } from './errors.js';

export function evaluatePredictions(rows, { threshold = 0.5, calibrationBins = 10 } = {}) {
  if (!Array.isArray(rows)) throw new ValidationError('Prediction rows must be an array');
  const usable = rows.filter((row) => row.label === 0 || row.label === 1);
  if (!usable.length) throw new ValidationError('No labeled prediction rows were supplied');
  if (usable.some((row) => !Number.isFinite(row.probability) || row.probability < 0 || row.probability > 1)) throw new ValidationError('Probabilities must be finite values from 0 to 1');
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new ValidationError('Threshold must be from 0 to 1');
  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (const row of usable) {
    const predicted = row.probability >= threshold ? 1 : 0;
    if (predicted && row.label) tp += 1;
    else if (!predicted && !row.label) tn += 1;
    else if (predicted) fp += 1;
    else fn += 1;
  }
  const monitoredHours = usable.reduce((sum, row) => sum + Math.max(Number(row.monitoredMs ?? 0), 0), 0) / 3_600_000;
  const calibration = calibrationReport(usable, calibrationBins);
  return {
    count: usable.length,
    threshold,
    prevalence: safeDivide(tp + fn, usable.length),
    confusion: { tp, tn, fp, fn },
    sensitivity: safeDivide(tp, tp + fn),
    specificity: safeDivide(tn, tn + fp),
    precision: safeDivide(tp, tp + fp),
    negativePredictiveValue: safeDivide(tn, tn + fn),
    falseInterventionsPerHour: monitoredHours ? fp / monitoredHours : null,
    auroc: rocAuc(usable),
    auprc: prAuc(usable),
    brierScore: mean(usable.map((row) => (row.probability - row.label) ** 2)),
    calibration
  };
}

export function participantBootstrap(rows, { iterations = 1000, confidence = 0.95, seed = 81273, threshold = 0.5 } = {}) {
  const grouped = groupBy(rows, (row) => row.participantId);
  const ids = [...grouped.keys()].filter((id) => id != null);
  if (ids.length < 2 || ids.length !== grouped.size) throw new ValidationError('Participant bootstrap requires at least two non-null participant IDs');
  if (!Number.isInteger(iterations) || iterations < 100) throw new ValidationError('Bootstrap iterations must be an integer of at least 100');
  const random = seededRandom(seed);
  const metrics = ['auroc', 'auprc', 'specificity', 'sensitivity', 'brierScore', 'falseInterventionsPerHour'];
  const samples = Object.fromEntries(metrics.map((metric) => [metric, []]));
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const resample = [];
    for (let index = 0; index < ids.length; index += 1) {
      const selected = ids[Math.floor(random() * ids.length)];
      resample.push(...grouped.get(selected));
    }
    const result = evaluatePredictions(resample, { threshold });
    for (const metric of metrics) if (Number.isFinite(result[metric])) samples[metric].push(result[metric]);
  }
  const alpha = (1 - confidence) / 2;
  return Object.fromEntries(metrics.map((metric) => [metric, interval(samples[metric], alpha)]));
}

export function subgroupReport(rows, groupField, options = {}) {
  const groups = groupBy(rows, (row) => row[groupField] ?? 'unknown');
  return Object.fromEntries([...groups.entries()].map(([group, groupRows]) => [group, evaluatePredictions(groupRows, options)]));
}

export function validateHeldOutRows(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new ValidationError('Held-out validation data are required');
  const invalid = rows.find((row) => row.split !== 'held_out' || !row.participantId || !Number.isFinite(row.probability) || ![0, 1, null].includes(row.label));
  if (invalid) throw new ValidationError('Every row must identify a participant, use split="held_out", include probability, and label 0, 1, or null');
  return rows;
}

export function calibrationReport(rows, binCount = 10) {
  const bins = Array.from({ length: binCount }, (_, index) => ({ lower: index / binCount, upper: (index + 1) / binCount, probabilities: [], labels: [] }));
  for (const row of rows) {
    const index = Math.min(Math.floor(clamp(row.probability, 0, 1) * binCount), binCount - 1);
    bins[index].probabilities.push(row.probability);
    bins[index].labels.push(row.label);
  }
  const populated = bins.filter((bin) => bin.labels.length).map((bin) => ({ lower: bin.lower, upper: bin.upper, count: bin.labels.length, meanProbability: mean(bin.probabilities), observedRate: mean(bin.labels) }));
  const expectedCalibrationError = populated.reduce((sum, bin) => sum + bin.count / rows.length * Math.abs(bin.meanProbability - bin.observedRate), 0);
  return { expectedCalibrationError, bins: populated };
}

export class DriftMonitor {
  constructor(referenceRows, featureNames) {
    this.featureNames = featureNames;
    this.reference = Object.fromEntries(featureNames.map((name) => [name, distribution(referenceRows.map((row) => row[name]))]));
  }
  evaluate(currentRows, { psiThreshold = 0.2, meanShiftThreshold = 1 } = {}) {
    const features = this.featureNames.map((name) => {
      const currentValues = currentRows.map((row) => row[name]).filter(Number.isFinite);
      const ref = this.reference[name];
      const current = distribution(currentValues, ref.edges);
      const psi = current.rates.reduce((sum, rate, index) => sum + (rate - ref.rates[index]) * Math.log((rate + 1e-6) / (ref.rates[index] + 1e-6)), 0);
      const standardizedMeanShift = Math.abs(current.mean - ref.mean) / Math.max(ref.std, 1e-6);
      return { name, psi, standardizedMeanShift, drift: psi >= psiThreshold || standardizedMeanShift >= meanShiftThreshold };
    });
    return { drift: features.some((feature) => feature.drift), features };
  }
}

function rocAuc(rows) {
  const sorted = [...rows].sort((a, b) => a.probability - b.probability);
  const positives = sorted.filter((row) => row.label === 1).length;
  const negatives = sorted.length - positives;
  if (!positives || !negatives) return null;
  let positiveRankSum = 0;
  for (let index = 0; index < sorted.length;) {
    let end = index + 1;
    while (end < sorted.length && sorted[end].probability === sorted[index].probability) end += 1;
    const averageRank = (index + 1 + end) / 2;
    for (let cursor = index; cursor < end; cursor += 1) if (sorted[cursor].label === 1) positiveRankSum += averageRank;
    index = end;
  }
  return (positiveRankSum - positives * (positives + 1) / 2) / (positives * negatives);
}
function prAuc(rows) {
  const sorted = [...rows].sort((a, b) => b.probability - a.probability);
  const positives = sorted.filter((row) => row.label === 1).length;
  if (!positives) return null;
  let tp = 0, fp = 0, previousRecall = 0, area = 0;
  for (const row of sorted) {
    if (row.label) tp += 1; else fp += 1;
    const recall = tp / positives;
    const precision = tp / (tp + fp);
    area += (recall - previousRecall) * precision;
    previousRecall = recall;
  }
  return area;
}
function safeDivide(numerator, denominator) { return denominator ? numerator / denominator : null; }
function groupBy(values, keyFn) { const result = new Map(); for (const value of values) { const key = keyFn(value); if (!result.has(key)) result.set(key, []); result.get(key).push(value); } return result; }
function seededRandom(seed) { let state = seed >>> 0; return () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; }; }
function interval(values, alpha) { const sorted = [...values].sort((a, b) => a - b); return { lower: quantile(sorted, alpha), median: quantile(sorted, 0.5), upper: quantile(sorted, 1 - alpha) }; }
function quantile(sorted, q) { if (!sorted.length) return null; const position = (sorted.length - 1) * q; const base = Math.floor(position); const rest = position - base; return sorted[base + 1] == null ? sorted[base] : sorted[base] + rest * (sorted[base + 1] - sorted[base]); }
function distribution(values, edges = null) {
  const clean = values.filter(Number.isFinite);
  const sorted = [...clean].sort((a, b) => a - b);
  if (!clean.length) return { edges: edges ?? Array(9).fill(0), rates: Array(10).fill(0), mean: 0, std: 0 };
  const boundaries = edges ?? Array.from({ length: 9 }, (_, index) => quantile(sorted, (index + 1) / 10));
  const counts = Array(10).fill(0);
  for (const value of clean) counts[Math.min(boundaries.findIndex((edge) => value <= edge) < 0 ? 9 : boundaries.findIndex((edge) => value <= edge), 9)] += 1;
  const average = mean(clean);
  const std = Math.sqrt(mean(clean.map((value) => (value - average) ** 2)));
  return { edges: boundaries, rates: counts.map((count) => clean.length ? count / clean.length : 0), mean: average, std };
}
