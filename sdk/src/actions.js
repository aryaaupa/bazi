import { ConfigurationError, ValidationError } from './errors.js';
import { deepCopy } from './utils.js';

export const NO_ACTION_ID = 'no_action';

export class ActionRegistry {
  #actions = new Map();
  constructor(actions = []) {
    this.register({ id: NO_ACTION_ID, label: 'No intervention', burden: 0, priorScore: 0, requiresApproval: false, safeForExploration: false });
    actions.forEach((action) => this.register(action));
  }

  register(action) {
    if (!action || typeof action.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(action.id)) {
      throw new ValidationError('Action id must use lowercase letters, numbers, and underscores');
    }
    if (this.#actions.has(action.id)) throw new ConfigurationError(`Duplicate action: ${action.id}`);
    for (const [field, fallback, min, max] of [['burden', 0, 0, 1], ['priorScore', 0, -Infinity, Infinity], ['minRisk', 0, 0, 1], ['maxRisk', 1, 0, 1], ['maxFatigue', 1, 0, 1]]) {
      const value = action[field] ?? fallback;
      if (!Number.isFinite(value) || value < min || value > max) throw new ValidationError(`${field} is outside the permitted range`);
    }
    if (action.minRisk != null && action.maxRisk != null && action.minRisk > action.maxRisk) throw new ValidationError('minRisk cannot exceed maxRisk');
    if (action.allowedTaskTypes != null && (!Array.isArray(action.allowedTaskTypes) || action.allowedTaskTypes.some((value) => typeof value !== 'string' || !value))) throw new ValidationError('allowedTaskTypes must be null or an array of strings');
    if (action.metadata != null && (!action.metadata || typeof action.metadata !== 'object' || Array.isArray(action.metadata))) throw new ValidationError('metadata must be an object');
    const normalized = {
      id: action.id,
      label: action.label ?? action.id,
      burden: action.burden ?? 0,
      priorScore: action.priorScore ?? 0,
      requiresApproval: Boolean(action.requiresApproval),
      safeForExploration: Boolean(action.safeForExploration),
      allowedTaskTypes: action.allowedTaskTypes ?? null,
      minRisk: action.minRisk ?? 0,
      maxRisk: action.maxRisk ?? 1,
      maxFatigue: action.maxFatigue ?? 1,
      metadata: deepCopy(action.metadata ?? {})
    };
    this.#actions.set(normalized.id, normalized);
    return normalized;
  }

  allowed(context, constraints = {}) {
    const denied = new Set(constraints.deniedActionIds ?? []);
    const allowed = new Set(constraints.allowedActionIds ?? this.ids());
    const discomfort = Number(context.discomfort ?? 0);
    return [...this.#actions.values()].filter((action) => {
      if (action.id === NO_ACTION_ID) return true;
      if (!allowed.has(action.id) || denied.has(action.id)) return false;
      if (action.allowedTaskTypes && !action.allowedTaskTypes.includes(context.taskType)) return false;
      if (context.probability < action.minRisk || context.probability > action.maxRisk) return false;
      if (context.fatigue > action.maxFatigue) return false;
      if (discomfort > 0 && action.metadata.increasesIntensity) return false;
      return true;
    }).map(deepCopy);
  }

  get(id) { return deepCopy(this.#actions.get(id)); }
  ids() { return [...this.#actions.keys()]; }
}

export const DEFAULT_ACTIONS = [
  { id: 'encouragement', label: 'Brief encouragement cue', burden: 0.08, priorScore: 0.15, safeForExploration: true },
  { id: 'pace_adjustment', label: 'Provider-approved pacing adjustment', burden: 0.18, priorScore: 0.08, requiresApproval: true },
  { id: 'micro_break', label: 'Provider-approved micro break', burden: 0.22, priorScore: 0.1, requiresApproval: true, minRisk: 0.55 },
  { id: 'provider_review', label: 'Route session for provider review', burden: 0.05, priorScore: 0.2, requiresApproval: false, minRisk: 0.7 }
];
