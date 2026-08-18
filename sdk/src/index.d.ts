export type TelemetryMetrics = {
  latencyMs?: number;
  pauseMs?: number;
  cadence?: number;
  motionEnergy?: number;
  smoothness?: number;
  engagementScore?: number;
  error?: boolean;
  fatigue?: number;
  difficulty?: number;
  completed?: boolean;
};

export type TelemetrySample = {
  timestamp?: number;
  kind: string;
  taskType?: string;
  quality?: number;
  sessionId?: string;
  metrics: TelemetryMetrics;
};

export type ActionDefinition = {
  id: string;
  label?: string;
  burden?: number;
  priorScore?: number;
  requiresApproval?: boolean;
  safeForExploration?: boolean;
  allowedTaskTypes?: string[] | null;
  minRisk?: number;
  maxRisk?: number;
  maxFatigue?: number;
  metadata?: Record<string, unknown> & { increasesIntensity?: boolean };
};

export type OutcomeObservation = {
  observationComplete: boolean;
  sensorValid?: boolean;
  confounded?: boolean;
  recoveryDelta?: number;
  completed?: boolean;
  abandoned?: boolean;
  dismissed?: boolean;
};

export type Decision = {
  id: string;
  sessionId: string;
  subjectKey?: string | null;
  createdAt: string;
  observationDueAt: number;
  status: 'pending_approval' | 'approved' | 'rejected' | 'executed' | 'no_action' | 'observed' | 'censored';
  features: Record<string, number | boolean | string>;
  risk: { probability: number; uncertainty: number; version: string; validated: boolean };
  disengagementDefinition: DisengagementDefinitionInput;
  eligibility: { eligible: boolean; threshold: number; reasons: string[] };
  allowedActionIds: string[];
  action: ActionDefinition;
};

export interface StorageAdapter {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export type BaziSDKOptions = {
  clock?: () => number;
  storage?: StorageAdapter;
  storageKey?: string;
  recoveryWindowMs?: number;
  maxDecisionRecords?: number;
  decisionRetentionMs?: number;
  stateRetentionMs?: number;
  burdenDecay?: number;
  requireValidatedModel?: boolean;
  requireEncryptedStorage?: boolean;
  protocolEnabled?: boolean;
  constraints?: { allowedActionIds?: string[]; deniedActionIds?: string[] };
  actions?: ActionDefinition[];
  actionManifest?: FrozenActionManifest;
  authorizer?: HostAuthorizer;
  consentManager?: ConsentManager;
  incidentLog?: IncidentLog;
  disengagement?: Partial<DisengagementDefinitionInput>;
  executor?: (action: ActionDefinition, decision: Partial<Decision>) => Promise<unknown> | unknown;
  [key: string]: unknown;
};

export class BaziEngagementSDK {
  constructor(options?: BaziSDKOptions);
  startSession(input?: { sessionId?: string; subjectKey?: string | null; discomfort?: number }): string;
  startAuthenticatedSession(input: { credential: unknown; sessionId?: string; subjectKey?: string | null; discomfort?: number }): Promise<string>;
  setDiscomfort(value: number, credential?: unknown): Promise<void>;
  updateConstraints(constraints: BaziSDKOptions['constraints'], credential?: unknown): Promise<void>;
  setProtocolEnabled(enabled: boolean, credential?: unknown): Promise<void>;
  registerAction(action: ActionDefinition, credential?: unknown): Promise<ActionDefinition>;
  ingest(sample: TelemetrySample, options?: { decide?: boolean }): Promise<Decision | null>;
  decide(): Promise<Decision>;
  approve(decisionId: string, approvedBy?: string): Promise<Decision>;
  reject(decisionId: string, rejectedBy?: string): Promise<Decision>;
  observeOutcome(decisionId: string, outcome: OutcomeObservation): Promise<{ valid: boolean; censored: boolean; reward: number | null; reasons: string[] }>;
  getDecision(id: string): Decision | null;
  listDecisions(): Decision[];
  exportAudit(): unknown[];
  privacyStatus(): { rawRecordCount: number; policy: string; persistedRawTelemetry: boolean };
  deleteSubject(subjectKey: string, credential?: unknown): Promise<void>;
  save(): Promise<void>;
  restore(): Promise<boolean>;
  clear(): Promise<void>;
}

export class ActionRegistry { constructor(actions?: ActionDefinition[]); register(action: ActionDefinition): ActionDefinition; allowed(context: Record<string, unknown>, constraints?: Record<string, string[]>): ActionDefinition[]; get(id: string): ActionDefinition | undefined; ids(): string[]; }
export class AuditLog { constructor(options?: Record<string, unknown>); append(type: string, payload?: Record<string, unknown>): unknown; list(): unknown[]; clear(): void; }
export class EligibilityManager { constructor(options?: Record<string, number>); evaluate(input: Record<string, unknown>): { eligible: boolean; threshold: number; reasons: string[] }; }
export class RollingFeatureExtractor { constructor(options?: Record<string, number>); ingest(sample: TelemetrySample): unknown; freezeBaseline(untilTimestamp: number): void; snapshot(): Record<string, unknown>; reset(): void; exportState(): unknown; importState(state: unknown): void; }
export class LinUCBPolicy { constructor(options: { dimensions: number; alpha?: number; ridge?: number }); }
export class LogisticRiskModel { constructor(options?: Record<string, unknown>); predict(features: Record<string, unknown>): Record<string, unknown>; validated: boolean; }
export class RewardEvaluator { constructor(options?: Record<string, number>); }
export class EphemeralTelemetryBuffer { constructor(options?: Record<string, unknown>); readonly size: number; }
export class MemoryStorageAdapter implements StorageAdapter { get(key: string): Promise<unknown>; set(key: string, value: unknown): Promise<void>; delete(key: string): Promise<void>; }
export class LocalStorageAdapter implements StorageAdapter { constructor(storage?: Storage); get(key: string): Promise<unknown>; set(key: string, value: unknown): Promise<void>; delete(key: string): Promise<void>; }
export const DEFAULT_ACTIONS: ActionDefinition[];
export const NO_ACTION_ID: 'no_action';
export const FEATURE_ORDER: string[];
export function featureVector(features: Record<string, unknown>): number[];
export function validateTelemetry(sample: TelemetrySample, clock?: () => number): Required<Omit<TelemetrySample, 'sessionId'>> & { sessionId: string | null };
export class BaziError extends Error { code: string; details?: unknown; }
export class ConfigurationError extends BaziError {}
export class DecisionNotFoundError extends BaziError {}
export class ValidationError extends BaziError {}

export type DisengagementDefinitionInput = {
  version: string;
  horizonMs: number;
  inactivityMs: number;
  qualifyingEvents: string[];
  anchor: 'decision_time' | string;
  censorOnSessionEnd: boolean;
};
export const DEFAULT_DISENGAGEMENT_DEFINITION: Readonly<DisengagementDefinitionInput>;
export class DisengagementDefinition {
  constructor(definition?: Partial<DisengagementDefinitionInput>);
  label(input: { anchorTimestamp: number; events: Array<{ timestamp: number; type: string }>; observationEndTimestamp?: number }): { label: 0 | 1 | null; censored: boolean; reason?: string; eventType?: string | null; eventTimestamp?: number | null; horizonEnd: number };
  toJSON(): DisengagementDefinitionInput;
}

export type PredictionRow = {
  participantId: string;
  split: 'held_out';
  probability: number;
  label: 0 | 1 | null;
  monitoredMs?: number;
  [key: string]: unknown;
};
export type MetricInterval = { lower: number | null; median: number | null; upper: number | null };
export type PredictionMetrics = {
  count: number; threshold: number; prevalence: number | null;
  confusion: { tp: number; tn: number; fp: number; fn: number };
  sensitivity: number | null; specificity: number | null; precision: number | null;
  negativePredictiveValue: number | null; falseInterventionsPerHour: number | null;
  auroc: number | null; auprc: number | null; brierScore: number;
  calibration: { expectedCalibrationError: number; bins: Array<{ lower: number; upper: number; count: number; meanProbability: number; observedRate: number }> };
};
export function evaluatePredictions(rows: PredictionRow[], options?: { threshold?: number; calibrationBins?: number }): PredictionMetrics;
export function participantBootstrap(rows: PredictionRow[], options?: { iterations?: number; confidence?: number; seed?: number; threshold?: number }): Record<string, MetricInterval>;
export function subgroupReport(rows: PredictionRow[], groupField: string, options?: { threshold?: number; calibrationBins?: number }): Record<string, PredictionMetrics>;
export function calibrationReport(rows: PredictionRow[], binCount?: number): PredictionMetrics['calibration'];
export function validateHeldOutRows(rows: PredictionRow[]): PredictionRow[];
export class DriftMonitor {
  constructor(referenceRows: Array<Record<string, number>>, featureNames: string[]);
  evaluate(currentRows: Array<Record<string, number>>, options?: { psiThreshold?: number; meanShiftThreshold?: number }): { drift: boolean; features: Array<{ name: string; psi: number; standardizedMeanShift: number; drift: boolean }> };
}

export type ActionManifestInput = {
  version: string; status: 'approved';
  reviewedBy: { name: string; professionalRole: string; credential?: string; jurisdiction?: string };
  reviewedAt: string; reviewScope: string; attestation: string;
  actions: ActionDefinition[];
  contraindications?: Array<{ id: string; when: { field: string; operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'in'; value: unknown }; denyActionIds: string[]; rationale?: string }>;
};
export class FrozenActionManifest {
  constructor(manifest: ActionManifestInput);
  readonly version: string;
  readonly actions: ReadonlyArray<Readonly<ActionDefinition>>;
  deniedActionIds(context: Record<string, unknown>): string[];
  package(): ActionManifestInput & { kind: 'bazi-action-manifest' };
}

export class ConsentManager {
  constructor(options?: { requiredPurpose?: string; clock?: () => number });
  grant(input: { subjectKey: string; version: string; purposes: string[]; expiresAt?: string | null; capturedBy?: string }): Record<string, unknown>;
  revoke(subjectKey: string): Record<string, unknown> | null;
  requireActive(subjectKey: string, purpose?: string): Record<string, unknown>;
  get(subjectKey: string): Record<string, unknown> | null;
  delete(subjectKey: string): void;
  exportState(): Array<Record<string, unknown>>;
  importState(records: Array<Record<string, unknown>>): void;
}

export type Principal = { id: string; roles: string[] };
export class HostAuthorizer {
  constructor(options: { verifyPrincipal: (credential: unknown) => Promise<Principal | null> | Principal | null; rolePermissions: Record<string, string[]> });
  authorize(credential: unknown, permission: string): Promise<Principal>;
}
export class IncidentLog {
  constructor(options?: { clock?: () => number; sink?: (incident: Record<string, unknown>) => unknown });
  record(input: { severity: 'low' | 'medium' | 'high' | 'critical'; category: string; summary: string; component: string; metadata?: Record<string, unknown> }): Record<string, unknown>;
  list(): Array<Record<string, unknown>>;
  clear(): void;
}
export class EncryptedStorageAdapter implements StorageAdapter {
  constructor(inner: StorageAdapter, key: CryptoKey, options?: { keyId?: string });
  readonly securityProfile: 'AES-256-GCM';
  static generateKey(): Promise<CryptoKey>;
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}
export class SignedPackageVerifier { constructor(publicKey: CryptoKey, options?: { isVersionAllowed?: (version: string) => boolean; keyId?: string | null }); verify(envelope: { payload: unknown; signature: string; algorithm?: 'Ed25519'; keyId?: string }): Promise<unknown>; }
export class SignedPackageSigner { constructor(privateKey: CryptoKey, options?: { keyId?: string }); sign(payload: unknown): Promise<{ payload: unknown; signature: string; algorithm: 'Ed25519'; keyId: string }>; }
export function canonicalJson(value: unknown): string;
export function createVerifiedBaziSDK(input: { signedPackage: { payload: unknown; signature: string }; verifier: SignedPackageVerifier; runtimeOptions?: BaziSDKOptions }): Promise<BaziEngagementSDK>;
