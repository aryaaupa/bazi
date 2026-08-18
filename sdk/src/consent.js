import { ValidationError } from './errors.js';
import { deepCopy, nowIso } from './utils.js';

export class ConsentManager {
  #records = new Map();
  constructor({ requiredPurpose = 'engagement_telemetry', clock = Date.now } = {}) { this.requiredPurpose = requiredPurpose; this.clock = clock; }
  grant({ subjectKey, version, purposes, expiresAt = null, capturedBy = 'host' }) {
    if (!subjectKey || !version || !Array.isArray(purposes)) throw new ValidationError('Consent requires subjectKey, version, and purposes');
    const record = { subjectKey, version, purposes: [...purposes], grantedAt: nowIso(this.clock), expiresAt, capturedBy, revokedAt: null };
    this.#records.set(subjectKey, record); return deepCopy(record);
  }
  revoke(subjectKey) { const record = this.#records.get(subjectKey); if (record) record.revokedAt = nowIso(this.clock); return deepCopy(record ?? null); }
  requireActive(subjectKey, purpose = this.requiredPurpose) {
    const record = this.#records.get(subjectKey);
    const active = record && !record.revokedAt && (!record.expiresAt || Date.parse(record.expiresAt) > this.clock()) && record.purposes.includes(purpose);
    if (!active) throw new ValidationError(`Active consent is required for ${purpose}`);
    return deepCopy(record);
  }
  get(subjectKey) { return deepCopy(this.#records.get(subjectKey) ?? null); }
  delete(subjectKey) { this.#records.delete(subjectKey); }
  exportState() { return [...this.#records.values()].map(deepCopy); }
  importState(records) {
    if (!Array.isArray(records)) throw new ValidationError('Consent state must be an array');
    this.#records = new Map(records.map((record) => [record.subjectKey, deepCopy(record)]));
  }
}
