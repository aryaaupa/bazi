import { ConfigurationError, ValidationError } from './errors.js';

export const DEFAULT_DISENGAGEMENT_DEFINITION = Object.freeze({
  version: 'disengagement-v1.0.0',
  horizonMs: 120_000,
  inactivityMs: 30_000,
  qualifyingEvents: ['premature_task_exit', 'omission_plus_30s_inactivity', 'active_task_30s_inactivity', 'failure_to_resume_30s'],
  anchor: 'decision_time',
  censorOnSessionEnd: true
});

export class DisengagementDefinition {
  constructor(definition = {}) {
    this.definition = Object.freeze({ ...DEFAULT_DISENGAGEMENT_DEFINITION, ...definition });
    if (!this.definition.version || typeof this.definition.version !== 'string') throw new ConfigurationError('Disengagement definition requires a version');
    if (!Number.isFinite(this.definition.horizonMs) || this.definition.horizonMs <= 0) throw new ConfigurationError('Prediction horizon must be a positive number of milliseconds');
    if (!Array.isArray(this.definition.qualifyingEvents) || !this.definition.qualifyingEvents.length) throw new ConfigurationError('At least one qualifying disengagement event is required');
  }

  label({ anchorTimestamp, events, observationEndTimestamp }) {
    if (!Number.isFinite(anchorTimestamp)) throw new ValidationError('anchorTimestamp is required');
    if (!Array.isArray(events)) throw new ValidationError('events must be an array');
    const horizonEnd = anchorTimestamp + this.definition.horizonMs;
    const match = events.find((event) => event.timestamp > anchorTimestamp && event.timestamp <= horizonEnd && (!Number.isFinite(observationEndTimestamp) || event.timestamp <= observationEndTimestamp) && this.definition.qualifyingEvents.includes(event.type));
    if (match) return { label: 1, censored: false, eventType: match.type, eventTimestamp: match.timestamp, horizonEnd };
    if (this.definition.censorOnSessionEnd && Number.isFinite(observationEndTimestamp) && observationEndTimestamp < horizonEnd) {
      return { label: null, censored: true, reason: 'insufficient_follow_up', horizonEnd };
    }
    return { label: 0, censored: false, eventType: null, eventTimestamp: null, horizonEnd };
  }

  toJSON() { return { ...this.definition }; }
}
