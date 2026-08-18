import { clamp, mean, slope, standardDeviation } from './utils.js';

const DEFAULTS = {
  windowSize: 20,
  baselineAlpha: 0.08,
  baselineFreezeMs: 30_000,
  minQuality: 0.6,
  minCoverage: 0.5,
  zLimit: 5
};

export class RollingFeatureExtractor {
  #derived = [];
  #baselines = new Map();
  #freezeUntil = 0;
  constructor(options = {}) { this.options = { ...DEFAULTS, ...options }; }

  ingest(sample) {
    const derived = {
      timestamp: sample.timestamp,
      kind: sample.kind,
      taskType: sample.taskType,
      quality: sample.quality,
      latencyMs: numeric(sample.metrics.latencyMs),
      pauseMs: numeric(sample.metrics.pauseMs),
      cadence: numeric(sample.metrics.cadence),
      motionEnergy: numeric(sample.metrics.motionEnergy),
      smoothness: numeric(sample.metrics.smoothness),
      engagementScore: numeric(sample.metrics.engagementScore),
      error: Boolean(sample.metrics.error),
      fatigue: normalize01(sample.metrics.fatigue),
      difficulty: normalize01(sample.metrics.difficulty),
      completed: Boolean(sample.metrics.completed)
    };
    this.#derived.push(derived);
    while (this.#derived.length > this.options.windowSize) this.#derived.shift();
    if (sample.timestamp >= this.#freezeUntil && sample.quality >= this.options.minQuality) this.#updateBaselines(derived);
    return derived;
  }

  freezeBaseline(untilTimestamp) { this.#freezeUntil = Math.max(this.#freezeUntil, untilTimestamp); }

  snapshot() {
    const window = [...this.#derived];
    const valid = window.filter((row) => row.quality >= this.options.minQuality);
    const coverage = window.length ? valid.length / window.length : 0;
    const vals = (key) => valid.map((row) => row[key]).filter(Number.isFinite);
    const engagement = vals('engagementScore');
    const cadence = vals('cadence');
    const latency = vals('latencyMs');
    const pauses = vals('pauseMs');
    const motion = vals('motionEnergy');
    const smoothness = vals('smoothness');
    const feature = {
      latencyDeviation: positiveZ(mean(latency), this.#baselines.get('latencyMs'), this.options.zLimit),
      pauseRate: valid.length ? valid.filter((row) => (row.pauseMs ?? 0) > 1500).length / valid.length : 0,
      cadenceDrift: negativeZ(mean(cadence), this.#baselines.get('cadence'), this.options.zLimit),
      motionVariance: clamp(standardDeviation(motion) / 10, 0, 2),
      smoothnessDrop: negativeZ(mean(smoothness), this.#baselines.get('smoothness'), this.options.zLimit),
      engagementSlope: clamp(-slope(engagement) / 10, -2, 2),
      errorRate: valid.length ? valid.filter((row) => row.error).length / valid.length : 0,
      fatigue: clamp(mean(vals('fatigue')), 0, 1),
      monotony: monotonyIndex(valid),
      missingRate: 1 - coverage,
      coverage,
      sampleCount: window.length,
      sensorValid: window.length >= 3 && coverage >= this.options.minCoverage,
      taskType: valid.at(-1)?.taskType ?? 'unspecified'
    };
    return feature;
  }

  reset() { this.#derived = []; this.#baselines.clear(); this.#freezeUntil = 0; }
  exportState() {
    return { derived: [], baselines: Object.fromEntries(this.#baselines), freezeUntil: this.#freezeUntil, sampleWindowPersisted: false };
  }
  importState(state = {}) {
    this.#derived = Array.isArray(state.derived) ? state.derived.slice(-this.options.windowSize) : [];
    this.#baselines = new Map(Object.entries(state.baselines ?? {}));
    this.#freezeUntil = state.freezeUntil ?? 0;
  }

  #updateBaselines(derived) {
    for (const key of ['latencyMs', 'cadence', 'motionEnergy', 'smoothness', 'engagementScore']) {
      const value = derived[key];
      if (!Number.isFinite(value)) continue;
      const previous = this.#baselines.get(key);
      if (!previous) this.#baselines.set(key, { mean: value, variance: 1, count: 1 });
      else {
        const alpha = this.options.baselineAlpha;
        const delta = value - previous.mean;
        this.#baselines.set(key, {
          mean: (1 - alpha) * previous.mean + alpha * value,
          variance: Math.max((1 - alpha) * previous.variance + alpha * delta ** 2, 1e-6),
          count: previous.count + 1
        });
      }
    }
  }
}

function numeric(value) { return Number.isFinite(value) ? Number(value) : null; }
function normalize01(value) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  return Number.isFinite(value) ? clamp(Number(value), 0, 1) : 0;
}
function positiveZ(value, baseline, limit) {
  if (!Number.isFinite(value) || !baseline || baseline.count < 2) return 0;
  return clamp((value - baseline.mean) / Math.sqrt(baseline.variance), -limit, limit) / limit;
}
function negativeZ(value, baseline, limit) { return -positiveZ(value, baseline, limit); }
function monotonyIndex(rows) {
  if (rows.length < 2) return 0;
  const kinds = new Set(rows.map((row) => row.kind));
  return clamp(1 - (kinds.size - 1) / Math.max(rows.length - 1, 1), 0, 1);
}

export const FEATURE_ORDER = [
  'latencyDeviation', 'pauseRate', 'cadenceDrift', 'motionVariance', 'smoothnessDrop',
  'engagementSlope', 'errorRate', 'fatigue', 'monotony', 'missingRate'
];

export function featureVector(features) {
  return FEATURE_ORDER.map((name) => Number(features[name]) || 0);
}
