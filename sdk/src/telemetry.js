import { ValidationError } from './errors.js';
import { assertFiniteNumber, deepCopy, stableId } from './utils.js';

const ALLOWED_FIELDS = new Set(['timestamp', 'kind', 'metrics', 'quality', 'taskType', 'sessionId']);
const METRIC_RULES = {
  latencyMs: { min: 0 }, pauseMs: { min: 0 }, cadence: { min: 0 }, motionEnergy: { min: 0 },
  smoothness: { min: 0, max: 1 }, engagementScore: { min: 0, max: 100 },
  error: { boolean: true }, fatigue: { min: 0, max: 1 }, difficulty: { min: 0, max: 1 }, completed: { boolean: true }
};

export function validateTelemetry(sample, clock = Date.now) {
  if (!sample || typeof sample !== 'object' || Array.isArray(sample)) {
    throw new ValidationError('Telemetry sample must be an object');
  }
  for (const key of Object.keys(sample)) if (!ALLOWED_FIELDS.has(key)) throw new ValidationError(`Unsupported telemetry field: ${key}`);
  const timestamp = sample.timestamp ?? clock();
  assertFiniteNumber(timestamp, 'timestamp', { min: 0 });
  if (typeof sample.kind !== 'string' || !sample.kind.trim() || sample.kind.length > 64) {
    throw new ValidationError('Telemetry sample requires a non-empty kind');
  }
  if (!sample.metrics || typeof sample.metrics !== 'object' || Array.isArray(sample.metrics)) {
    throw new ValidationError('Telemetry sample requires a metrics object');
  }
  for (const [key, value] of Object.entries(sample.metrics)) {
    const rule = METRIC_RULES[key];
    if (!rule) throw new ValidationError(`Unsupported telemetry metric: ${key}`);
    if (rule.boolean && typeof value !== 'boolean') throw new ValidationError(`Metric ${key} must be boolean`);
    if (!rule.boolean) assertFiniteNumber(value, `metrics.${key}`, { min: rule.min, max: rule.max ?? Infinity });
  }
  if (sample.quality != null) assertFiniteNumber(sample.quality, 'quality', { min: 0, max: 1 });
  if (sample.taskType != null && (typeof sample.taskType !== 'string' || !sample.taskType.trim() || sample.taskType.length > 64)) throw new ValidationError('taskType must be a non-empty string of at most 64 characters');
  if (sample.sessionId != null && (typeof sample.sessionId !== 'string' || !sample.sessionId || sample.sessionId.length > 128)) throw new ValidationError('sessionId must be a non-empty string of at most 128 characters');
  return {
    timestamp,
    kind: sample.kind.trim(),
    metrics: { ...sample.metrics },
    quality: sample.quality ?? 1,
    taskType: sample.taskType?.trim() ?? 'unspecified',
    sessionId: sample.sessionId ?? null
  };
}

export class EphemeralTelemetryBuffer {
  #records = [];
  #sequence = 0;
  constructor({ maxRecords = 256, ttlMs = 30_000, clock = Date.now } = {}) {
    assertFiniteNumber(maxRecords, 'maxRecords', { min: 1 });
    assertFiniteNumber(ttlMs, 'ttlMs', { min: 0 });
    this.maxRecords = Math.floor(maxRecords);
    this.ttlMs = ttlMs;
    this.clock = clock;
  }
  add(sample) {
    this.purgeExpired();
    const record = { id: stableId('RAW', this.clock, ++this.#sequence), receivedAt: this.clock(), sample: deepCopy(sample) };
    this.#records.push(record);
    while (this.#records.length > this.maxRecords) this.#records.shift();
    return record.id;
  }
  consume(id) {
    const index = this.#records.findIndex((record) => record.id === id);
    if (index < 0) return null;
    const [record] = this.#records.splice(index, 1);
    return record.sample;
  }
  purgeExpired() {
    const cutoff = this.clock() - this.ttlMs;
    this.#records = this.#records.filter((record) => record.receivedAt > cutoff);
  }
  clear() { this.#records = []; }
  get size() { this.purgeExpired(); return this.#records.length; }
  inspectMetadata() { return this.#records.map(({ id, receivedAt }) => ({ id, receivedAt })); }
}
