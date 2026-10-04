import { assess, validateEvent, fingerprint, MODEL, mean } from './model.js';
import { generateCohort, SEED, START, DAY } from './cohort.js';

export const ACTIONS = Object.freeze([
  { id: 'engagement_checkin', label: 'Supportive engagement check-in', purpose: 'Ask about scheduling, usability, fatigue, or participation barriers.' },
  { id: 'scheduling_support', label: 'Offer scheduling support', purpose: 'Offer a provider-reviewed time or reminder preference.' },
  { id: 'usability_checkin', label: 'Check for usability barriers', purpose: 'Ask whether navigating the program is making participation harder.' }
]);
export const DISMISS_REASONS = ['Clinically inappropriate', 'Already contacted', 'Expected behavior', 'Data quality issue', 'Other'];
export const STORAGE_KEY = 'bazi-connected-workspace-v1';
export function freshState() {
  return { version: 1, seed: SEED, threshold: MODEL.defaultThreshold, protocolEnabled: true,
    cursors: { 'BZ-001': 24 }, extraEvents: {}, newPatients: [], decisions: [], audit: [], pilot: null };
}

export class Workspace {
  constructor({ storage = null, clock = Date.now } = {}) {
    this.storage = storage; this.clock = clock; this.storageWarning = null;
    this.state = freshState();
    try {
      const saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null');
      if (saved?.version === 1 && Array.isArray(saved.decisions) && Array.isArray(saved.audit) && Array.isArray(saved.newPatients) && Number.isFinite(saved.threshold) && saved.threshold >= 0.2 && saved.threshold <= 0.95) this.state = saved;
    } catch { this.storageWarning = 'Saved demo state could not be read. A fresh sandbox is in use.'; }
    this.cohort = generateCohort(500, this.state.seed);
    this.cache = new Map();
  }
  get patients() { return [...this.cohort, ...this.state.newPatients]; }
  patient(id) { const patient = this.patients.find(patient => patient.id === id); if (!patient) throw new Error('Patient not found.'); return patient; }
  events(id) {
    const patient = this.patient(id);
    const cursor = this.state.cursors[id] ?? (patient.scenario === 'low_data' ? 3 : 24);
    return [...patient.events.slice(0, cursor), ...(this.state.extraEvents[id] ?? [])]
      .sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at));
  }
  assessment(id) {
    if (!this.cache.has(id)) this.cache.set(id, assess(this.patient(id), this.events(id), this.state.threshold));
    return this.cache.get(id);
  }
  list() { return this.patients.map(patient => ({ ...patient, assessment: this.assessment(patient.id) })); }
  save() {
    this.cache.clear();
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.state)); }
    catch { this.storageWarning = 'Browser storage is unavailable. This session works, but changes will not survive a refresh. Export your demo state.'; }
  }
  async log(type, detail = {}) {
    const previousHash = this.state.audit.at(-1)?.hash ?? '0'.repeat(64);
    const record = { sequence: this.state.audit.length + 1, at: new Date(this.clock()).toISOString(), type, actor: 'Synthetic provider', detail, previousHash };
    record.hash = await fingerprint(record);
    this.state.audit.push(record); this.save(); return record;
  }
  async initialize() {
    if (!this.state.audit.length) await this.log('workspace_initialized', { patients: this.cohort.length, seed: this.state.seed, modelVersion: MODEL.version, data: 'synthetic-only' });
  }
  async reset() {
    this.state = freshState(); this.cohort = generateCohort(500, this.state.seed); this.save(); await this.initialize();
  }
  async startDemo() {
    this.state.cursors['BZ-001'] = 17; delete this.state.extraEvents['BZ-001'];
    this.state.decisions = this.state.decisions.filter(decision => decision.patientId !== 'BZ-001');
    this.state.protocolEnabled = true; this.save();
    await this.log('guided_demo_started', { patientId: 'BZ-001', preservedCohort: true });
  }
  async createPatient({ name, scenario = 'gradual' }) {
    if (!name?.trim() || name.trim().length > 80) throw new Error('Use a synthetic name between 1 and 80 characters.');
    if (!['gradual', 'stable', 'sudden', 'intermittent', 'low_data'].includes(scenario)) throw new Error('Unknown synthetic trajectory.');
    if (this.state.newPatients.length >= 100) throw new Error('This sandbox supports up to 100 additional synthetic patients.');
    const id = `BZ-${this.patients.length + 1}`;
    const template = generateCohort(1, this.state.seed + this.patients.length)[0];
    // Regenerate the requested archetype from a deterministic cohort if needed.
    const archetype = generateCohort(500, this.state.seed + this.patients.length).find(patient => patient.scenario === scenario);
    if (!archetype) throw new Error('This synthetic seed does not contain the requested trajectory. Try another trajectory.');
    const patient = { ...archetype, id, name: name.trim(), events: archetype.events.map((event, index) => ({ ...event, patient_id: id, id: `${id}-event-${index + 1}` })) };
    this.state.newPatients.push(patient); this.state.cursors[id] = 0; this.save();
    await this.log('synthetic_patient_created', { patientId: id, scenario: patient.scenario }); return patient;
  }
  async advance(id) {
    const patient = this.patient(id);
    if (this.state.extraEvents[id]?.length) throw new Error('This record has additional observations. Use the event form to append the next observation.');
    const cursor = this.state.cursors[id] ?? (patient.scenario === 'low_data' ? 3 : 24);
    const event = patient.events[cursor];
    if (!event) throw new Error('The 12-week trajectory is complete. Add a synthetic event to continue.');
    this.state.cursors[id] = cursor + 1; this.save();
    await this.log('event_ingested', { patientId: id, eventId: event.id, occurredAt: event.occurred_at, source: 'synthetic-generator' });
    return this.evaluate(id, 'advance-simulation');
  }
  async ingestBatch(input) {
    if (!Array.isArray(input) || !input.length || input.length > 1000) throw new Error('Import between 1 and 1,000 synthetic events.');
    const staged = new Map();
    for (const [index, value] of input.entries()) {
      const patient = this.patient(value.patient_id); validateEvent(value);
      const existing = staged.get(patient.id) ?? this.events(patient.id);
      if (existing.some(event => event.occurred_at === value.occurred_at)) throw new Error(`Row ${index + 1}: an event already exists at this timestamp.`);
      if (Date.parse(value.occurred_at) <= Date.parse(existing.at(-1)?.occurred_at ?? '1970-01-01')) throw new Error(`Row ${index + 1}: new observations must follow the current patient history.`);
      const event = { ...value, id: `${patient.id}-import-${this.clock()}-${index}`, day: (Date.parse(value.occurred_at) - START) / DAY, quality: value.quality ?? 1, source: 'synthetic-local-import' };
      staged.set(patient.id, [...existing, event]);
    }
    for (const [id, events] of staged) {
      const oldCount = this.events(id).length;
      this.state.extraEvents[id] = [...(this.state.extraEvents[id] ?? []), ...events.slice(oldCount)];
    }
    this.save(); await this.log('synthetic_events_imported', { count: input.length, patientIds: [...staged.keys()] });
    for (const id of staged.keys()) await this.evaluate(id, 'event-import');
    return input.length;
  }
  async evaluate(id, source = 'manual') {
    const result = this.assessment(id);
    const snapshot = await fingerprint({ model: MODEL.version, features: result.features, threshold: this.state.threshold,
      protocolEnabled: this.state.protocolEnabled, lastEventAt: this.events(id).at(-1)?.occurred_at ?? null });
    const existing = this.state.decisions.find(decision => decision.patientId === id && decision.snapshot === snapshot && !['superseded', 'dismissed'].includes(decision.status));
    if (existing) {
      if (existing.status === 'snoozed' && this.clock() >= Date.parse(existing.snoozedUntil)) {
        existing.status = this.state.protocolEnabled && result.band === 'elevated' ? 'pending' : 'monitoring';
        this.save(); await this.log('snoozed_review_reopened', { decisionId: existing.id, patientId: id });
      }
      return existing;
    }
    const active = this.state.decisions.find(decision => decision.patientId === id && ['approved', 'followup_complete'].includes(decision.status));
    const lastEventTime = Date.parse(this.events(id).at(-1)?.occurred_at ?? 0);
    const held = active && lastEventTime - Date.parse(active.observationStart) < 7 * DAY;
    let status = !result.available ? 'insufficient_data' : !this.state.protocolEnabled ? 'disabled' : held ? 'recovery_window' : result.band === 'elevated' ? 'pending' : 'monitoring';
    // One unresolved recommendation per patient; keep its review history and snapshot.
    let snoozedUntil = null;
    for (const decision of this.state.decisions.filter(decision => decision.patientId === id && ['pending', 'snoozed'].includes(decision.status))) {
      if (decision.status === 'snoozed' && this.clock() < Date.parse(decision.snoozedUntil)) { status = 'snoozed'; snoozedUntil = decision.snoozedUntil; }
      decision.status = 'superseded';
    }
    const sequence = Math.max(0, ...this.state.decisions.map(decision => Number(decision.id.slice(4)) || 0)) + 1;
    const decision = { id: `DEC-${String(sequence).padStart(5, '0')}`, patientId: id,
      at: new Date(this.clock()).toISOString(), observationStart: this.events(id).at(-1)?.occurred_at,
      modelVersion: MODEL.version, snapshot, features: result.features, score: result.available ? result.score : null,
      status, source, actionId: 'engagement_checkin', threshold: this.state.threshold,
      evidence: result.evidence, note: '', reviewHistory: [] };
    if (status === 'snoozed') decision.snoozedUntil = snoozedUntil;
    this.state.decisions.unshift(decision); this.save();
    await this.log('model_scored', { decisionId: decision.id, patientId: id, score: decision.score, status, modelVersion: MODEL.version, inputFingerprint: snapshot });
    return decision;
  }
  decision(id) { const decision = this.state.decisions.find(decision => decision.id === id); if (!decision) throw new Error('Decision not found.'); return decision; }
  async review(id, action, { actionId, note = '', reason } = {}) {
    const decision = this.decision(id);
    if (!['pending', 'snoozed'].includes(decision.status)) throw new Error('This recommendation has already been resolved.');
    if (action === 'approve' && decision.status === 'snoozed' && this.clock() < Date.parse(decision.snoozedUntil)) throw new Error('This recommendation is snoozed. Wait until the review time or generate a new review after the snooze expires.');
    if (action === 'approve' || action === 'modify') {
      if (!this.state.protocolEnabled) throw new Error('Recommendations are disabled. Enable the protocol in Governance first.');
      const current = this.assessment(decision.patientId);
      if (!current.available || current.band !== 'elevated') throw new Error('Current observations do not meet the review threshold. Evaluate this patient again.');
      if (!ACTIONS.some(candidate => candidate.id === (actionId ?? decision.actionId))) throw new Error('Select a permitted engagement action.');
    }
    if (note.length > 1000) throw new Error('Provider notes must be 1,000 characters or fewer.');
    if (action === 'modify') { decision.actionId = actionId; decision.note = note; }
    else if (action === 'approve') {
      decision.status = 'approved'; decision.approvedAt = new Date(this.clock()).toISOString();
      decision.approvedBy = 'Synthetic provider'; decision.note = note || decision.note;
      decision.observationStart = this.events(decision.patientId).at(-1).occurred_at;
    } else if (action === 'dismiss') {
      if (!DISMISS_REASONS.includes(reason) || (reason === 'Other' && !note.trim())) throw new Error('Choose a dismissal reason and describe it if you select Other.');
      decision.status = 'dismissed'; decision.reason = reason; decision.note = note;
    } else if (action === 'snooze') {
      decision.status = 'snoozed'; decision.snoozedUntil = new Date(this.clock() + 48 * 3600000).toISOString();
    } else throw new Error('Unknown review action.');
    decision.reviewHistory.push({ action, at: new Date(this.clock()).toISOString(), note, reason, actionId: decision.actionId });
    this.save(); await this.log(`decision_${action}`, { patientId: decision.patientId, decisionId: id, actionId: decision.actionId, reason: reason ?? null, delivery: action === 'approve' ? 'sandbox-only; no outreach sent' : null }); return decision;
  }
  async followUp(id, response = 'recovery') {
    const decision = this.decision(id);
    if (decision.status !== 'approved') throw new Error('Approve a recommendation before simulating its follow-up.');
    if (!['recovery', 'no_change'].includes(response)) throw new Error('Unknown follow-up trajectory.');
    const patient = this.patient(decision.patientId), before = this.events(patient.id).slice(-3), start = Date.parse(this.events(patient.id).at(-1).occurred_at);
    const observations = [2, 4, 7].map((day, index) => ({
      id: `${decision.id}-followup-${index + 1}`, patient_id: patient.id,
      occurred_at: new Date(start + day * DAY).toISOString(), day: (start - START) / DAY + day,
      status: response === 'recovery' ? 'completed' : 'shortened',
      duration_minutes: response === 'recovery' ? patient.baseline_duration - 2 + index : Math.round(patient.baseline_duration * 0.4),
      engagement: response === 'recovery' ? patient.baseline_engagement - 5 + index * 2 : Math.round(mean(before.map(event => event.engagement))),
      fatigue: response === 'recovery' ? 'low' : 'high', difficulty: response === 'recovery' ? 'appropriate' : 'too-hard', quality: 1,
      source: `synthetic-followup-${response}`
    }));
    this.state.extraEvents[patient.id] = [...(this.state.extraEvents[patient.id] ?? []), ...observations];
    decision.outcome = { simulation: true, response, windowDays: 7, beforeEngagement: mean(before.map(event => event.engagement)),
      afterEngagement: mean(observations.map(event => event.engagement)), beforeAdherence: before.filter(event => event.status !== 'skipped').length / Math.max(before.length, 1),
      afterAdherence: observations.filter(event => event.status !== 'skipped').length / observations.length,
      eventIds: observations.map(event => event.id), causalConclusion: false };
    decision.status = 'followup_complete'; this.save();
    await this.log('followup_observed', { decisionId: id, patientId: patient.id, response, observationDays: 7, synthetic: true, causalConclusion: false }); return decision;
  }
  async setProtocol(enabled) { this.state.protocolEnabled = Boolean(enabled); this.save(); await this.log('protocol_status_changed', { enabled: this.state.protocolEnabled }); }
  async setThreshold(value) {
    if (!Number.isFinite(value) || value < 0.2 || value > 0.95) throw new Error('Threshold must be between 0.20 and 0.95.');
    this.state.threshold = value; this.save(); await this.log('demo_threshold_changed', { value, heldOutProtocol: 'Explorer only; freeze the threshold before external validation.' });
  }
  async savePilot(config) { this.state.pilot = { ...config, at: new Date(this.clock()).toISOString(), status: 'draft', synthetic: true }; this.save(); await this.log('pilot_protocol_drafted', { version: config.version, endpoint: config.endpoint, threshold: config.threshold }); return this.state.pilot; }
}

export function parseEventCsv(text) {
  if (text.length > 1000000) throw new Error('Use a CSV smaller than 1 MB.');
  const rows = []; let row = [], field = '', quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') { if (quoted && text[index + 1] === '"') { field += '"'; index++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if (char === '\n' && !quoted) { row.push(field.replace(/\r$/, '')); if (row.some(value => value.trim())) rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  row.push(field.replace(/\r$/, '')); if (row.some(value => value.trim())) rows.push(row);
  const headers = rows.shift()?.map(header => header.trim().replace(/^\uFEFF/, '')) ?? [];
  const required = ['patient_id', 'occurred_at', 'status', 'duration_minutes', 'engagement', 'fatigue', 'difficulty', 'quality'];
  if (headers.length !== required.length || !required.every(header => headers.includes(header))) throw new Error(`CSV headers must be: ${required.join(',')}`);
  if (!rows.length || rows.length > 1000) throw new Error('Import between 1 and 1,000 events.');
  return rows.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Row ${index + 2} has the wrong number of columns.`);
    const value = Object.fromEntries(headers.map((header, i) => [header, values[i].trim()]));
    for (const key of ['duration_minutes', 'engagement', 'quality']) { if (value[key] === '') throw new Error(`Row ${index + 2}: ${key} is required.`); value[key] = Number(value[key]); }
    return validateEvent(value);
  });
}

export function draftProtocol(config) {
  return `# Bazi design-partner validation protocol\n\nStatus: DRAFT — requires institutional review and a governed dataset.\n\nProgram: ${config.program}\nEndpoint: ${config.endpoint}\nPrediction horizon: ${config.horizon} days\nObservation window: ${config.observation} days\nAlert threshold: ${config.threshold}\nMinimum observable sessions: ${config.minimumSessions}\nPrimary endpoint: AUPRC\nSecondary endpoints: AUROC, calibration, warning lead time, false alerts per participant-week, subgroup results, and participant bootstrap confidence intervals.\n\n## Study controls\nParticipant-level splits; frozen model, feature schema, threshold and endpoint before held-out analysis; no tuning on the held-out set. Exclude already-disengaged participants at the landmark. Missing labels remain censored, not negative. Record exclusions and provenance.\n\n## Proposed progression\n1. Define one digital-care workflow and one endpoint.\n2. Retrospective validation on governed, de-identified historical data.\n3. Silent prospective validation with no influence on patient care.\n4. Provider-controlled engagement study after appropriate reviews and approvals.\n\n## Safety boundary\nEngagement support only. No diagnosis, prescription, autonomous care-plan changes, or automated patient outreach. The current artifact has synthetic provenance and no clinical validation.\n\n## Go / no-go criteria to agree with the partner\nMinimum useful warning lead time, maximum acceptable alert burden, sample size, subgroup precision, and a predefined stopping rule. Values must be jointly specified before analysis.\n\nGenerated from the Bazi Pilot Studio; this is a draft protocol, not an approved clinical study.\n`;
}
