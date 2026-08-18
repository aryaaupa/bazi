import { ActionRegistry, DEFAULT_ACTIONS, NO_ACTION_ID } from './actions.js';
import { AuditLog } from './audit.js';
import { EligibilityManager } from './eligibility.js';
import { DecisionNotFoundError } from './errors.js';
import { featureVector, RollingFeatureExtractor } from './features.js';
import { LinUCBPolicy } from './policy.js';
import { LogisticRiskModel } from './risk.js';
import { RewardEvaluator } from './reward.js';
import { EphemeralTelemetryBuffer, validateTelemetry } from './telemetry.js';
import { clamp, deepCopy, stableId } from './utils.js';
import { DisengagementDefinition } from './outcomes.js';
import { FrozenActionManifest } from './manifest.js';

const DEFAULT_CONFIG = {
  sdkVersion: '0.2.0',
  storageKey: 'bazi-sdk-state-v1',
  recoveryWindowMs: 30_000,
  burdenDecay: 0.82,
  maxDecisionRecords: 500,
  decisionRetentionMs: 30 * 24 * 60 * 60 * 1000,
  stateRetentionMs: 30 * 24 * 60 * 60 * 1000,
  requireValidatedModel: false,
  requireEncryptedStorage: false,
  protocolEnabled: true,
  constraints: {}
};

export class BaziEngagementSDK {
  #sequence = 0;
  #decisions = new Map();
  #session = emptySession();
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.clock = options.clock ?? Date.now;
    this.outcomeDefinition = options.outcomeDefinition instanceof DisengagementDefinition ? options.outcomeDefinition : new DisengagementDefinition(options.disengagement);
    this.rawBuffer = options.rawBuffer ?? new EphemeralTelemetryBuffer({ ...(options.telemetry ?? {}), clock: this.clock });
    this.features = options.featureExtractor ?? new RollingFeatureExtractor(options.features);
    this.riskModel = options.riskModel ?? new LogisticRiskModel(options.model);
    this.eligibility = options.eligibilityManager ?? new EligibilityManager(options.eligibility);
    if (options.actionManifest && !(options.actionManifest instanceof FrozenActionManifest)) throw new Error('actionManifest must be a FrozenActionManifest');
    this.actionManifest = options.actionManifest ?? null;
    this.actions = options.actionRegistry ?? new ActionRegistry(this.actionManifest?.actions ?? options.actions ?? DEFAULT_ACTIONS);
    this.policy = options.policy ?? new LinUCBPolicy({ dimensions: 13, ...(options.policyOptions ?? {}) });
    this.reward = options.rewardEvaluator ?? new RewardEvaluator(options.reward);
    this.audit = options.auditLog ?? new AuditLog({ ...(options.audit ?? {}), clock: this.clock });
    this.storage = options.storage ?? null;
    this.executor = options.executor ?? null;
    this.authorizer = options.authorizer ?? null;
    this.consentManager = options.consentManager ?? null;
    this.incidentLog = options.incidentLog ?? null;
    if (this.config.requireValidatedModel && !this.riskModel.validated) throw new Error('A validated risk model is required by configuration');
    if (this.config.requireEncryptedStorage && this.storage && this.storage.securityProfile !== 'AES-256-GCM') throw new Error('Encrypted storage is required by configuration');
  }

  startSession({ sessionId, subjectKey = null, discomfort = 0, principal = null } = {}) {
    if (this.authorizer) throw new Error('Use startAuthenticatedSession() when an authorizer is configured');
    return this.#beginSession({ sessionId, subjectKey, discomfort, principal });
  }

  #beginSession({ sessionId, subjectKey = null, discomfort = 0, principal = null } = {}) {
    this.features.reset();
    this.#session = { id: sessionId ?? stableId('SES', this.clock, ++this.#sequence), subjectKey, principalId: principal?.id ?? null, interventionCount: 0, lastInterventionAt: null, burden: 0, discomfort: clamp(discomfort, 0, 1) };
    this.audit.append('session_started', { sessionId: this.#session.id, principalId: this.#session.principalId });
    return this.#session.id;
  }

  async startAuthenticatedSession({ credential, sessionId, subjectKey = null, discomfort = 0 } = {}) {
    const principal = await this.#authorize(credential, 'ingest_telemetry');
    return this.#beginSession({ sessionId, subjectKey, discomfort, principal });
  }

  async setDiscomfort(value, credential = 'system') {
    const principal = await this.#authorize(credential, 'update_session');
    this.#session.discomfort = clamp(Number(value) || 0, 0, 1);
    this.audit.append('discomfort_updated', { sessionId: this.#session.id, authorizedBy: principal.id, value: this.#session.discomfort });
  }

  async updateConstraints(constraints, credential = 'system') {
    const principal = await this.#authorize(credential, 'manage_constraints');
    this.config.constraints = deepCopy(constraints ?? {});
    this.audit.append('constraints_updated', { authorizedBy: principal.id, constraints: this.config.constraints });
  }

  async setProtocolEnabled(enabled, credential = 'system') {
    const principal = await this.#authorize(credential, 'manage_protocol');
    this.config.protocolEnabled = Boolean(enabled);
    this.audit.append('protocol_status_updated', { enabled: this.config.protocolEnabled, authorizedBy: principal.id });
  }

  async registerAction(action, credential = 'system') {
    const principal = await this.#authorize(credential, 'manage_actions');
    if (this.actionManifest) throw new Error('Actions are frozen by the provider-reviewed manifest');
    const registered = this.actions.register(action);
    this.audit.append('action_registered', { actionId: registered.id, authorizedBy: principal.id, requiresApproval: registered.requiresApproval });
    return registered;
  }

  async ingest(input, { decide = true } = {}) {
    if (!this.#session.id) {
      if (this.authorizer) throw new Error('Authenticated session required before telemetry ingestion');
      this.#beginSession();
    }
    if (this.consentManager) this.consentManager.requireActive(this.#session.subjectKey);
    const sample = validateTelemetry({ ...input, sessionId: input.sessionId ?? this.#session.id }, this.clock);
    const rawId = this.rawBuffer.add(sample);
    try {
      this.features.ingest(sample);
      this.audit.append('telemetry_derived', { sessionId: this.#session.id, kind: sample.kind, quality: sample.quality });
    } catch (error) {
      this.incidentLog?.record({ severity: 'medium', category: 'telemetry_processing', summary: error.message, component: 'feature_extractor', metadata: { sessionId: this.#session.id, errorCode: error.code ?? 'UNEXPECTED' } });
      throw error;
    } finally {
      this.rawBuffer.consume(rawId);
    }
    return decide ? this.decide() : null;
  }

  async decide() {
    const now = this.clock();
    this.#purgeExpiredDecisions(now);
    const features = this.features.snapshot();
    const risk = this.riskModel.predict(features);
    this.#session.burden *= this.config.burdenDecay;
    const gate = this.eligibility.evaluate({
      probability: risk.probability,
      uncertainty: risk.uncertainty,
      features,
      burden: this.#session.burden,
      lastInterventionAt: this.#session.lastInterventionAt,
      interventionCount: this.#session.interventionCount,
      now,
      protocolEnabled: this.config.protocolEnabled
    });
    const context = { probability: risk.probability, uncertainty: risk.uncertainty, fatigue: features.fatigue, taskType: features.taskType, discomfort: this.#session.discomfort };
    const manifestDenied = this.actionManifest?.deniedActionIds({ ...context, discomfort: this.#session.discomfort }) ?? [];
    const allowedActions = this.actions.allowed(context, { ...this.config.constraints, deniedActionIds: [...new Set([...(this.config.constraints.deniedActionIds ?? []), ...manifestDenied])] });
    const policyContext = [...featureVector(features), risk.probability, risk.uncertainty, this.#session.burden];
    let selection;
    if (!gate.eligible) {
      selection = { selected: this.actions.get(NO_ACTION_ID), scored: [] };
    } else {
      selection = this.policy.choose(allowedActions, policyContext, { allowExploration: true });
    }
    const action = selection.selected ?? this.actions.get(NO_ACTION_ID);
    const id = stableId('DEC', this.clock, ++this.#sequence);
    const executed = action.id !== NO_ACTION_ID && !action.requiresApproval;
    const decision = {
      id,
      sessionId: this.#session.id,
      subjectKey: this.#session.subjectKey,
      createdAt: new Date(now).toISOString(),
      observationDueAt: now + this.config.recoveryWindowMs,
      status: action.requiresApproval ? 'pending_approval' : executed ? 'executed' : 'no_action',
      features,
      risk,
      disengagementDefinition: this.outcomeDefinition.toJSON(),
      eligibility: gate,
      allowedActionIds: allowedActions.map(({ id: actionId }) => actionId),
      action,
      policyScores: selection.scored.map(({ action: scoredAction, ...score }) => ({ actionId: scoredAction.id, ...score })),
      policyContext
    };
    this.#decisions.set(id, decision);
    while (this.#decisions.size > this.config.maxDecisionRecords) this.#decisions.delete(this.#decisions.keys().next().value);
    if (executed) await this.#execute(decision, now);
    this.audit.append('decision_created', sanitizeDecision(decision));
    await this.save();
    return deepCopy(decision);
  }

  async approve(decisionId, credential = 'provider') {
    const principal = await this.#authorize(credential, 'approve_action');
    const decision = this.#requireDecision(decisionId);
    if (decision.status !== 'pending_approval') return deepCopy(decision);
    decision.status = 'approved';
    decision.approvedBy = principal.id;
    decision.approvedAt = new Date(this.clock()).toISOString();
    await this.#execute(decision, this.clock());
    this.audit.append('decision_approved', { decisionId, approvedBy: principal.id, actionId: decision.action.id });
    await this.save();
    return deepCopy(decision);
  }

  async reject(decisionId, credential = 'provider') {
    const principal = await this.#authorize(credential, 'approve_action');
    const decision = this.#requireDecision(decisionId);
    decision.status = 'rejected';
    decision.rejectedBy = principal.id;
    decision.rejectedAt = new Date(this.clock()).toISOString();
    this.audit.append('decision_rejected', { decisionId, rejectedBy: principal.id, actionId: decision.action.id });
    await this.save();
    return deepCopy(decision);
  }

  async observeOutcome(decisionId, outcome) {
    const decision = this.#requireDecision(decisionId);
    let evaluation;
    if (decision.status === 'pending_approval' || decision.status === 'rejected') {
      evaluation = { valid: false, censored: true, reward: null, reasons: ['action_not_executed'] };
    } else if (this.clock() < decision.observationDueAt) {
      evaluation = { valid: false, censored: true, reward: null, reasons: ['recovery_window_incomplete'] };
    } else {
      evaluation = this.reward.evaluate(outcome, decision.action);
    }
    decision.outcome = deepCopy(outcome);
    decision.reward = evaluation;
    decision.status = evaluation.valid ? 'observed' : 'censored';
    if (evaluation.valid && decision.action.id !== NO_ACTION_ID) this.policy.update(decision.action.id, decision.policyContext, evaluation.reward);
    this.audit.append('outcome_observed', { decisionId, actionId: decision.action.id, ...evaluation });
    await this.save();
    return deepCopy(evaluation);
  }

  getDecision(id) { this.#purgeExpiredDecisions(); const decision = this.#decisions.get(id); return decision ? deepCopy(decision) : null; }
  listDecisions() { this.#purgeExpiredDecisions(); return [...this.#decisions.values()].map(deepCopy); }
  exportAudit() { return this.audit.list(); }
  privacyStatus() { return { rawRecordCount: this.rawBuffer.size, policy: 'consume-after-feature-extraction', persistedRawTelemetry: false }; }

  async deleteSubject(subjectKey, credential = 'system') {
    const principal = await this.#authorize(credential, 'delete_subject_data');
    let deletedDecisions = 0;
    for (const [id, decision] of this.#decisions) if (decision.subjectKey === subjectKey) { this.#decisions.delete(id); deletedDecisions += 1; }
    if (this.#session.subjectKey === subjectKey) {
      this.rawBuffer.clear(); this.features.reset();
      this.#session = emptySession();
    }
    this.consentManager?.delete(subjectKey);
    this.audit.append('subject_data_deleted', { deletedDecisions, authorizedBy: principal.id });
    await this.save();
  }

  async save() {
    if (!this.storage) return;
    const now = this.clock();
    this.#purgeExpiredDecisions(now);
    await this.storage.set(this.config.storageKey, {
      sdkVersion: this.config.sdkVersion,
      savedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.config.stateRetentionMs).toISOString(),
      session: this.#session,
      featureState: this.features.exportState(),
      policyState: this.policy.exportState(),
      decisions: [...this.#decisions.values()].map(stripRaw),
      consents: this.consentManager?.exportState?.() ?? null
    });
  }

  async restore() {
    if (!this.storage) return false;
    const state = await this.storage.get(this.config.storageKey);
    if (!state) return false;
    if (state.expiresAt && Date.parse(state.expiresAt) <= this.clock()) {
      await this.storage.delete(this.config.storageKey);
      this.audit.append('expired_state_deleted', {});
      return false;
    }
    this.#session = state.session ?? this.#session;
    this.features.importState(state.featureState);
    this.policy.importState(state.policyState);
    this.#decisions = new Map((state.decisions ?? []).map((decision) => [decision.id, decision]));
    this.#purgeExpiredDecisions();
    if (state.consents && this.consentManager?.importState) this.consentManager.importState(state.consents);
    this.audit.append('state_restored', { sessionId: this.#session.id, decisionCount: this.#decisions.size });
    return true;
  }

  async clear() {
    this.rawBuffer.clear(); this.features.reset(); this.#decisions.clear(); this.audit.clear();
    if (this.storage) await this.storage.delete(this.config.storageKey);
    this.#session = emptySession();
  }

  async #execute(decision, now) {
    decision.status = 'executed';
    decision.executedAt = new Date(now).toISOString();
    this.#session.interventionCount += 1;
    this.#session.lastInterventionAt = now;
    this.#session.burden = clamp(this.#session.burden + decision.action.burden, 0, 1);
    this.features.freezeBaseline(now + this.config.recoveryWindowMs);
    if (this.executor) decision.executionResult = deepCopy(await this.executor(deepCopy(decision.action), sanitizeDecision(decision)));
  }

  #requireDecision(id) {
    const decision = this.#decisions.get(id);
    if (!decision) throw new DecisionNotFoundError(id);
    return decision;
  }

  async #authorize(credential, permission) {
    if (this.authorizer) return this.authorizer.authorize(credential, permission);
    return { id: typeof credential === 'string' ? credential : credential?.id ?? 'system', roles: credential?.roles ?? [] };
  }

  #purgeExpiredDecisions(now = this.clock()) {
    const cutoff = now - this.config.decisionRetentionMs;
    for (const [id, decision] of this.#decisions) if (Date.parse(decision.createdAt) < cutoff) this.#decisions.delete(id);
  }
}

function sanitizeDecision(decision) {
  return { id: decision.id, sessionId: decision.sessionId, status: decision.status, probability: decision.risk.probability, uncertainty: decision.risk.uncertainty, threshold: decision.eligibility.threshold, actionId: decision.action.id, modelVersion: decision.risk.version };
}
function stripRaw(decision) { return deepCopy(decision); }
function emptySession() { return { id: null, subjectKey: null, principalId: null, interventionCount: 0, lastInterventionAt: null, burden: 0, discomfort: 0 }; }
