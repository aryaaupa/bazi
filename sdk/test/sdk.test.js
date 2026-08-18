import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ActionRegistry,
  BaziEngagementSDK,
  ConsentManager,
  createVerifiedBaziSDK,
  DisengagementDefinition,
  DriftMonitor,
  EncryptedStorageAdapter,
  EligibilityManager,
  FrozenActionManifest,
  HostAuthorizer,
  IncidentLog,
  LogisticRiskModel,
  MemoryStorageAdapter,
  SignedPackageSigner,
  SignedPackageVerifier,
  ValidationError,
  evaluatePredictions,
  participantBootstrap,
  subgroupReport,
  validateHeldOutRows,
  validateTelemetry
} from '../src/index.js';

function clock(start = 1_700_000_000_000) {
  let value = start;
  const fn = () => value;
  fn.advance = (ms) => { value += ms; };
  return fn;
}

const highRiskModel = {
  validated: true,
  predict: () => ({ probability: 0.91, uncertainty: 0.08, linear: 2.3, version: 'test-high-risk', validated: true, contributions: [] })
};

const lowRiskModel = {
  validated: true,
  predict: () => ({ probability: 0.1, uncertainty: 0.1, linear: -2.3, version: 'test-low-risk', validated: true, contributions: [] })
};

async function seedValidWindow(sdk, time) {
  for (let index = 0; index < 4; index += 1) {
    await sdk.ingest({
      timestamp: time(),
      kind: index % 2 ? 'tap' : 'motion',
      taskType: 'cognitive',
      quality: 0.95,
      metrics: {
        latencyMs: 300 + index * 20,
        pauseMs: index > 1 ? 2000 : 200,
        cadence: 1.2 - index * 0.05,
        engagementScore: 80 - index * 4,
        error: index === 3,
        fatigue: 0.4
      }
    }, { decide: false });
    time.advance(1000);
  }
}

test('telemetry validation rejects unknown and malformed metrics', () => {
  assert.throws(() => validateTelemetry({ kind: 'tap', metrics: { secretRawValue: 1 } }), ValidationError);
  assert.throws(() => validateTelemetry({ kind: 'tap', metrics: {}, freeText: 'sensitive note' }), ValidationError);
  assert.throws(() => validateTelemetry({ kind: 'tap', metrics: { fatigue: 2 } }), ValidationError);
  assert.throws(() => validateTelemetry({ kind: 'tap', metrics: { completed: 1 } }), ValidationError);
  assert.throws(() => validateTelemetry({ kind: '', metrics: {} }), ValidationError);
  assert.equal(validateTelemetry({ kind: 'tap', metrics: { latencyMs: 12 } }).kind, 'tap');
});

test('raw telemetry is consumed immediately after derived feature extraction', async () => {
  const time = clock();
  const sdk = new BaziEngagementSDK({ clock: time, riskModel: lowRiskModel });
  await sdk.ingest({ kind: 'tap', metrics: { latencyMs: 120 }, quality: 1 }, { decide: false });
  assert.deepEqual(sdk.privacyStatus(), {
    rawRecordCount: 0,
    policy: 'consume-after-feature-extraction',
    persistedRawTelemetry: false
  });
});

test('low risk selects no action and explains the failed threshold', async () => {
  const time = clock();
  const sdk = new BaziEngagementSDK({ clock: time, riskModel: lowRiskModel });
  await seedValidWindow(sdk, time);
  const decision = await sdk.decide();
  assert.equal(decision.action.id, 'no_action');
  assert.equal(decision.eligibility.eligible, false);
  assert.ok(decision.eligibility.reasons.includes('risk_below_threshold'));
});

test('high risk executes an allowed low-burden action and enforces cooldown', async () => {
  const time = clock();
  const executed = [];
  const sdk = new BaziEngagementSDK({
    clock: time,
    riskModel: highRiskModel,
    executor: async (action) => { executed.push(action.id); return { ok: true }; },
    constraints: { allowedActionIds: ['no_action', 'encouragement'] }
  });
  await seedValidWindow(sdk, time);
  const first = await sdk.decide();
  assert.equal(first.action.id, 'encouragement');
  assert.equal(first.status, 'executed');
  assert.deepEqual(executed, ['encouragement']);
  const second = await sdk.decide();
  assert.equal(second.action.id, 'no_action');
  assert.ok(second.eligibility.reasons.includes('cooldown_active'));
});

test('provider approval is required before executing a protected action', async () => {
  const time = clock();
  const executed = [];
  const registry = new ActionRegistry([
    { id: 'protected_break', label: 'Protected break', burden: 0.1, priorScore: 1, requiresApproval: true, safeForExploration: true }
  ]);
  const sdk = new BaziEngagementSDK({
    clock: time,
    riskModel: highRiskModel,
    actionRegistry: registry,
    constraints: { allowedActionIds: ['no_action', 'protected_break'] },
    executor: async (action) => executed.push(action.id)
  });
  await seedValidWindow(sdk, time);
  const decision = await sdk.decide();
  assert.equal(decision.status, 'pending_approval');
  assert.deepEqual(executed, []);
  const approved = await sdk.approve(decision.id, 'clinician-1');
  assert.equal(approved.status, 'executed');
  assert.deepEqual(executed, ['protected_break']);
});

test('discomfort masks actions that increase intensity', () => {
  const registry = new ActionRegistry([
    { id: 'increase_intensity', burden: 0.1, metadata: { increasesIntensity: true } },
    { id: 'check_in', burden: 0.1 }
  ]);
  const ids = registry.allowed({ probability: 0.9, fatigue: 0.3, taskType: 'rehab', discomfort: 0.7 }).map((action) => action.id);
  assert.ok(!ids.includes('increase_intensity'));
  assert.ok(ids.includes('check_in'));
  assert.ok(ids.includes('no_action'));
});

test('valid outcomes update policy and incomplete outcomes are censored', async () => {
  const time = clock();
  const sdk = new BaziEngagementSDK({
    clock: time,
    riskModel: highRiskModel,
    constraints: { allowedActionIds: ['no_action', 'encouragement'] }
  });
  await seedValidWindow(sdk, time);
  const decision = await sdk.decide();
  time.advance(30_001);
  const valid = await sdk.observeOutcome(decision.id, { observationComplete: true, sensorValid: true, recoveryDelta: 0.4, completed: true });
  assert.equal(valid.valid, true);
  assert.ok(valid.reward > 0);
  time.advance(60_000);
  const another = await sdk.decide();
  const censored = await sdk.observeOutcome(another.id, { observationComplete: false, sensorValid: true });
  assert.equal(censored.censored, true);
  assert.equal(censored.reward, null);
});

test('outcomes before the recovery window are censored', async () => {
  const time = clock();
  const sdk = new BaziEngagementSDK({ clock: time, riskModel: highRiskModel, constraints: { allowedActionIds: ['no_action', 'encouragement'] } });
  await seedValidWindow(sdk, time);
  const decision = await sdk.decide();
  const result = await sdk.observeOutcome(decision.id, { observationComplete: true, sensorValid: true, completed: true });
  assert.equal(result.censored, true);
  assert.deepEqual(result.reasons, ['recovery_window_incomplete']);
});

test('protocol shutoff forces no action', async () => {
  const time = clock();
  const sdk = new BaziEngagementSDK({ clock: time, riskModel: highRiskModel, constraints: { allowedActionIds: ['no_action', 'encouragement'] } });
  await seedValidWindow(sdk, time);
  await sdk.setProtocolEnabled(false, 'clinician-1');
  const decision = await sdk.decide();
  assert.equal(decision.action.id, 'no_action');
  assert.ok(decision.eligibility.reasons.includes('protocol_disabled'));
});

test('state can be saved and restored without raw telemetry', async () => {
  const time = clock();
  const storage = new MemoryStorageAdapter();
  const sdk = new BaziEngagementSDK({ clock: time, riskModel: highRiskModel, storage, constraints: { allowedActionIds: ['no_action', 'encouragement'] } });
  await seedValidWindow(sdk, time);
  const decision = await sdk.decide();
  const restored = new BaziEngagementSDK({ clock: time, riskModel: highRiskModel, storage });
  assert.equal(await restored.restore(), true);
  assert.equal(restored.getDecision(decision.id).id, decision.id);
  assert.equal(restored.privacyStatus().rawRecordCount, 0);
  assert.deepEqual((await storage.get('bazi-sdk-state-v1')).featureState.derived, []);
});

test('eligibility threshold rises with uncertainty and burden', () => {
  const manager = new EligibilityManager();
  const common = { probability: 0.8, features: { fatigue: 0.2, monotony: 0.2, sensorValid: true }, lastInterventionAt: null, interventionCount: 0, now: 1000 };
  const low = manager.evaluate({ ...common, uncertainty: 0.1, burden: 0.1 });
  const high = manager.evaluate({ ...common, uncertainty: 0.9, burden: 0.9 });
  assert.ok(high.threshold > low.threshold);
});

test('default risk model returns bounded probability, uncertainty, and contributions', () => {
  const model = new LogisticRiskModel();
  const prediction = model.predict({
    latencyDeviation: 0.3, pauseRate: 0.5, cadenceDrift: 0.2, motionVariance: 0.1,
    smoothnessDrop: 0.2, engagementSlope: 0.4, errorRate: 0.3, fatigue: 0.7,
    monotony: 0.8, missingRate: 0, coverage: 1
  });
  assert.ok(prediction.probability > 0 && prediction.probability < 1);
  assert.ok(prediction.uncertainty >= 0 && prediction.uncertainty <= 1);
  assert.equal(prediction.contributions.length, 10);
  assert.equal(prediction.validated, false);
});

test('constraint changes and action registration are auditable', async () => {
  const sdk = new BaziEngagementSDK({ riskModel: highRiskModel });
  await sdk.registerAction({ id: 'custom_check_in', burden: 0.05 }, 'provider-7');
  await sdk.updateConstraints({ allowedActionIds: ['no_action', 'custom_check_in'] }, 'provider-7');
  const types = sdk.exportAudit().map((entry) => entry.type);
  assert.ok(types.includes('action_registered'));
  assert.ok(types.includes('constraints_updated'));
});

test('rejected pending action cannot produce a learning reward', async () => {
  const time = clock();
  const registry = new ActionRegistry([{ id: 'approval_only', burden: 0.05, priorScore: 1, requiresApproval: true }]);
  const sdk = new BaziEngagementSDK({ clock: time, riskModel: highRiskModel, actionRegistry: registry, constraints: { allowedActionIds: ['no_action', 'approval_only'] } });
  await seedValidWindow(sdk, time);
  const decision = await sdk.decide();
  await sdk.reject(decision.id, 'provider-1');
  time.advance(30_001);
  const result = await sdk.observeOutcome(decision.id, { observationComplete: true, completed: true });
  assert.equal(result.censored, true);
  assert.deepEqual(result.reasons, ['action_not_executed']);
});

test('clear removes persisted and in-memory decision state', async () => {
  const time = clock();
  const storage = new MemoryStorageAdapter();
  const sdk = new BaziEngagementSDK({ clock: time, riskModel: lowRiskModel, storage });
  await seedValidWindow(sdk, time);
  const decision = await sdk.decide();
  await sdk.clear();
  assert.equal(sdk.getDecision(decision.id), null);
  assert.equal(await storage.get('bazi-sdk-state-v1'), null);
});

test('disengagement definition labels only qualifying events inside the prediction horizon', () => {
  const definition = new DisengagementDefinition({ horizonMs: 120_000 });
  assert.equal(definition.label({ anchorTimestamp: 1000, events: [{ timestamp: 2000, type: 'premature_task_exit' }], observationEndTimestamp: 121_000 }).label, 1);
  assert.equal(definition.label({ anchorTimestamp: 1000, events: [{ timestamp: 122_000, type: 'premature_task_exit' }], observationEndTimestamp: 122_000 }).label, 0);
  assert.equal(definition.label({ anchorTimestamp: 1000, events: [{ timestamp: 2000, type: 'premature_task_exit' }], observationEndTimestamp: 3000 }).label, 1);
  assert.deepEqual(definition.label({ anchorTimestamp: 1000, events: [], observationEndTimestamp: 100_000 }), {
    label: null, censored: true, reason: 'insufficient_follow_up', horizonEnd: 121_000
  });
});

const heldOutRows = [
  { participantId: 'p1', split: 'held_out', probability: 0.9, label: 1, monitoredMs: 450_000, group: 'a' },
  { participantId: 'p1', split: 'held_out', probability: 0.8, label: 0, monitoredMs: 450_000, group: 'a' },
  { participantId: 'p2', split: 'held_out', probability: 0.7, label: 1, monitoredMs: 450_000, group: 'a' },
  { participantId: 'p2', split: 'held_out', probability: 0.1, label: 0, monitoredMs: 450_000, group: 'a' },
  { participantId: 'p3', split: 'held_out', probability: 0.6, label: 1, monitoredMs: 450_000, group: 'b' },
  { participantId: 'p3', split: 'held_out', probability: 0.2, label: 0, monitoredMs: 450_000, group: 'b' },
  { participantId: 'p4', split: 'held_out', probability: 0.4, label: 1, monitoredMs: 450_000, group: 'b' },
  { participantId: 'p4', split: 'held_out', probability: 0.3, label: 0, monitoredMs: 450_000, group: 'b' }
];

test('held-out evaluator reports discrimination, calibration, specificity and false interventions per hour', () => {
  validateHeldOutRows(heldOutRows);
  const report = evaluatePredictions(heldOutRows, { threshold: 0.5, calibrationBins: 4 });
  assert.equal(report.specificity, 0.75);
  assert.equal(report.falseInterventionsPerHour, 1);
  assert.equal(report.auroc, 0.8125);
  assert.ok(Math.abs(report.auprc - 0.8041666667) < 1e-9);
  assert.ok(report.calibration.expectedCalibrationError >= 0);
});

test('participant bootstrap returns confidence intervals and subgroup reports', () => {
  const intervals = participantBootstrap(heldOutRows, { iterations: 200, seed: 7 });
  assert.ok(intervals.auroc.lower <= intervals.auroc.median);
  assert.ok(intervals.auroc.median <= intervals.auroc.upper);
  const groups = subgroupReport(heldOutRows, 'group');
  assert.deepEqual(Object.keys(groups).sort(), ['a', 'b']);
});

test('drift monitor flags a material feature distribution shift', () => {
  const monitor = new DriftMonitor([{ fatigue: 0.1 }, { fatigue: 0.2 }, { fatigue: 0.3 }, { fatigue: 0.4 }], ['fatigue']);
  const result = monitor.evaluate([{ fatigue: 3.1 }, { fatigue: 3.2 }, { fatigue: 3.3 }]);
  assert.equal(result.drift, true);
  assert.equal(result.features[0].drift, true);
});

function approvedManifest() {
  return new FrozenActionManifest({
    version: 'actions-1', status: 'approved',
    reviewedBy: { name: 'Test Reviewer', professionalRole: 'licensed clinician' },
    reviewedAt: '2026-08-18T00:00:00.000Z', reviewScope: 'Automated test fixture only',
    attestation: 'Test-only attestation; not a clinical approval.',
    actions: [{ id: 'gentle_prompt', burden: 0.05, safeForExploration: true }],
    contraindications: [{ id: 'fatigue-stop', when: { field: 'fatigue', operator: 'gte', value: 0.8 }, denyActionIds: ['gentle_prompt'] }]
  });
}

test('provider manifest is immutable and applies contraindication rules', async () => {
  const manifest = approvedManifest();
  assert.deepEqual(manifest.deniedActionIds({ fatigue: 0.9 }), ['gentle_prompt']);
  assert.throws(() => { manifest.actions[0].burden = 1; }, TypeError);
  const sdk = new BaziEngagementSDK({ actionManifest: manifest });
  await assert.rejects(sdk.registerAction({ id: 'late_action' }), /frozen/);
});

test('encrypted storage uses AES-GCM and round trips without plaintext in the inner adapter', async () => {
  const inner = new MemoryStorageAdapter();
  const key = await EncryptedStorageAdapter.generateKey();
  const encrypted = new EncryptedStorageAdapter(inner, key);
  await encrypted.set('subject-state', { privateMarker: 'never-store-this-plaintext' });
  const envelope = await inner.get('subject-state');
  assert.equal(envelope.algorithm, 'AES-GCM');
  assert.equal(envelope.keyId, 'platform-managed-key');
  assert.ok(!JSON.stringify(envelope).includes('never-store-this-plaintext'));
  assert.deepEqual(await encrypted.get('subject-state'), { privateMarker: 'never-store-this-plaintext' });
  await inner.set('subject-state', { ...envelope, keyId: 'attacker-key' });
  await assert.rejects(encrypted.get('subject-state'), /untrusted key ID/);
});

test('Ed25519 signed packages verify and reject tampering', async () => {
  const keys = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const signer = new SignedPackageSigner(keys.privateKey);
  const verifier = new SignedPackageVerifier(keys.publicKey);
  const signed = await signer.sign({ kind: 'bazi-runtime-package', version: '1', threshold: 0.71 });
  assert.equal((await verifier.verify(signed)).threshold, 0.71);
  await assert.rejects(verifier.verify({ ...signed, payload: { ...signed.payload, threshold: 0.2 } }), /verification failed/);
});

test('verified runtime factory loads only a signed validated model and approved action manifest', async () => {
  const keys = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const signer = new SignedPackageSigner(keys.privateKey, { keyId: 'release-key-1' });
  const verifier = new SignedPackageVerifier(keys.publicKey, { keyId: 'release-key-1', isVersionAllowed: (version) => version === 'runtime-1' });
  const model = {
    version: 'validated-test-model', validated: true, bias: -1,
    weights: { latencyDeviation: 0.5, pauseRate: 1, cadenceDrift: 0.5, motionVariance: 0.2, smoothnessDrop: 0.4, engagementSlope: 0.7, errorRate: 1, fatigue: 0.6, monotony: 0.2, missingRate: 0.8 }
  };
  const signedPackage = await signer.sign({ kind: 'bazi-runtime-package', version: 'runtime-1', model, config: { protocolEnabled: true }, actionManifest: approvedManifest().package() });
  const sdk = await createVerifiedBaziSDK({ signedPackage, verifier });
  assert.equal(sdk.riskModel.validated, true);
  assert.equal(sdk.actionManifest.version, 'actions-1');
});

test('encrypted-storage production gate rejects a plaintext adapter', async () => {
  assert.throws(() => new BaziEngagementSDK({ storage: new MemoryStorageAdapter(), requireEncryptedStorage: true }), /Encrypted storage/);
  const key = await EncryptedStorageAdapter.generateKey();
  assert.doesNotThrow(() => new BaziEngagementSDK({ storage: new EncryptedStorageAdapter(new MemoryStorageAdapter(), key), requireEncryptedStorage: true }));
});

test('authenticated sessions require permission and active versioned consent', async () => {
  const time = clock();
  const consent = new ConsentManager({ clock: time });
  const authorizer = new HostAuthorizer({
    verifyPrincipal: async (token) => token === 'valid-user' ? { id: 'user-1', roles: ['participant'] } : null,
    rolePermissions: { participant: ['ingest_telemetry', 'update_session'] }
  });
  const sdk = new BaziEngagementSDK({ clock: time, riskModel: lowRiskModel, authorizer, consentManager: consent });
  assert.throws(() => sdk.startSession(), /startAuthenticatedSession/);
  await assert.rejects(sdk.startAuthenticatedSession({ credential: 'bad-user', subjectKey: 'subject-1' }), ValidationError);
  await sdk.startAuthenticatedSession({ credential: 'valid-user', subjectKey: 'subject-1' });
  await assert.rejects(sdk.ingest({ kind: 'tap', metrics: { latencyMs: 20 } }), /Active consent/);
  consent.grant({ subjectKey: 'subject-1', version: 'consent-v2', purposes: ['engagement_telemetry'] });
  await sdk.ingest({ kind: 'tap', metrics: { latencyMs: 20 } }, { decide: false });
  assert.equal(consent.get('subject-1').version, 'consent-v2');
});

test('retention purges decisions and deletion removes subject state without logging the subject key', async () => {
  const time = clock();
  const consent = new ConsentManager({ clock: time });
  consent.grant({ subjectKey: 'delete-me', version: 'v1', purposes: ['engagement_telemetry'] });
  const sdk = new BaziEngagementSDK({ clock: time, riskModel: lowRiskModel, decisionRetentionMs: 100, consentManager: consent });
  sdk.startSession({ subjectKey: 'delete-me' });
  await seedValidWindow(sdk, time);
  const decision = await sdk.decide();
  time.advance(101);
  assert.equal(sdk.getDecision(decision.id), null);
  await sdk.deleteSubject('delete-me');
  assert.equal(consent.get('delete-me'), null);
  assert.ok(!JSON.stringify(sdk.exportAudit().at(-1)).includes('delete-me'));
});

test('incident log validates severity and creates auditable incident records', () => {
  const incidents = new IncidentLog();
  const incident = incidents.record({ severity: 'high', category: 'integrity', summary: 'Signature mismatch', component: 'runtime-package' });
  assert.equal(incident.severity, 'high');
  assert.equal(incidents.list().length, 1);
  assert.throws(() => incidents.record({ severity: 'urgent', category: 'x', summary: 'x', component: 'x' }), ValidationError);
});
