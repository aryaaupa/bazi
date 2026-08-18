import { ActionRegistry } from './actions.js';
import { ConfigurationError } from './errors.js';
import { deepCopy } from './utils.js';

export class FrozenActionManifest {
  constructor({ version, status, reviewedBy, reviewedAt, reviewScope, attestation, actions, contraindications = [] }) {
    if (!version || status !== 'approved' || !reviewedBy?.name || !reviewedBy?.professionalRole || !reviewedAt || !reviewScope || !attestation) {
      throw new ConfigurationError('Frozen action manifest requires approved status and complete provider review metadata');
    }
    if (!Array.isArray(actions) || !actions.length) throw new ConfigurationError('Frozen action manifest requires actions');
    new ActionRegistry(actions);
    const actionIds = new Set(['no_action', ...actions.map((action) => action.id)]);
    for (const rule of contraindications) {
      if (!rule.id || !rule.when?.field || !rule.when?.operator || !Array.isArray(rule.denyActionIds)) throw new ConfigurationError('Each contraindication requires id, when, and denyActionIds');
      if (rule.denyActionIds.includes('no_action')) throw new ConfigurationError('Contraindications cannot deny no_action');
      for (const id of rule.denyActionIds) if (!actionIds.has(id)) throw new ConfigurationError(`Contraindication references unknown action: ${id}`);
    }
    this.version = version;
    this.status = status;
    this.reviewedBy = deepFreeze(deepCopy(reviewedBy));
    this.reviewedAt = reviewedAt;
    this.reviewScope = reviewScope;
    this.attestation = attestation;
    this.actions = deepFreeze(deepCopy(actions));
    this.contraindications = deepFreeze(deepCopy(contraindications));
    Object.freeze(this);
  }

  deniedActionIds(context) {
    const denied = new Set();
    for (const rule of this.contraindications) {
      if (matches(context, rule.when)) for (const id of rule.denyActionIds ?? []) denied.add(id);
    }
    return [...denied];
  }

  package() { return { kind: 'bazi-action-manifest', version: this.version, status: this.status, reviewedBy: this.reviewedBy, reviewedAt: this.reviewedAt, reviewScope: this.reviewScope, attestation: this.attestation, actions: this.actions, contraindications: this.contraindications }; }
}

function matches(context, condition = {}) {
  const actual = context[condition.field];
  if (condition.operator === 'gt') return actual > condition.value;
  if (condition.operator === 'gte') return actual >= condition.value;
  if (condition.operator === 'lt') return actual < condition.value;
  if (condition.operator === 'lte') return actual <= condition.value;
  if (condition.operator === 'eq') return actual === condition.value;
  if (condition.operator === 'in') return condition.value?.includes(actual);
  return false;
}
function deepFreeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; }
