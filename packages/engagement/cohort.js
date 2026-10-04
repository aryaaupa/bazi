import { clamp, assess, computeFeatures } from './model.js';
import { evaluatePredictions, subgroupReport, DriftMonitor } from '../../sdk/src/validation.js';

export const COHORT_VERSION = 'synthetic-cohort-v1';
export const SEED = 90317;
export const START = Date.parse('2026-07-06T14:00:00Z');
export const DAY = 86400000;
export const LANDMARK_DAY = 53;
const FIRST = ['Maya', 'Jordan', 'Sam', 'Anika', 'Marcus', 'Noor', 'Avery', 'Alex', 'Riley', 'Priya', 'Elliot', 'Morgan', 'Taylor', 'Sofia', 'Kai', 'Amara', 'Jamie', 'Dev', 'Nina', 'Rowan'];
const LAST = ['Chen', 'Lee', 'Rivera', 'Shah', 'Hill', 'Patel', 'Reed', 'Park', 'Ellis', 'Singh', 'Martin', 'Ali', 'Nguyen', 'Ortiz', 'Brooks', 'Khan', 'Young', 'Davis', 'Garcia', 'Bennett', 'Lewis', 'Wright', 'Thomas', 'Kim', 'Wilson'];
export const SCENARIO_LABELS = {
  stable: 'Steady participation', gradual: 'Gradual disengagement', sudden: 'Sudden dropout', intermittent: 'Intermittent adherence',
  recovering: 'Recovering participation', fatigue: 'High fatigue, adherent', false_positive: 'Decline without dropout', schedule: 'Schedule disruption', low_data: 'Limited telemetry'
};
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
}
const eventDay = index => Math.floor(index / 3) * 7 + [0, 2, 4][index % 3];
export function generateCohort(count = 500, seed = SEED) {
  const random = seededRandom(seed), patients = [];
  for (let index = 0; index < count; index++) {
    const r = random();
    const scenario = index === 0 ? 'gradual' : r < 0.36 ? 'stable' : r < 0.54 ? 'gradual' : r < 0.62 ? 'sudden' : r < 0.72 ? 'intermittent' : r < 0.81 ? 'recovering' : r < 0.88 ? 'fatigue' : r < 0.93 ? 'false_positive' : r < 0.97 ? 'schedule' : 'low_data';
    const patient = {
      id: `BZ-${String(index + 1).padStart(3, '0')}`,
      name: index === 0 ? 'Maya Chen' : `${FIRST[index % FIRST.length]} ${LAST[Math.floor(index / FIRST.length) % LAST.length]}`,
      program: 'Digital behavioral health', ageGroup: ['18–34', '35–54', '55+'][Math.floor(random() * 3)],
      baseline_duration: 22 + Math.round(random() * 12), baseline_engagement: 80 + Math.round(random() * 12),
      scenario, events: []
    };
    const willDrop = (scenario === 'gradual' && (index === 0 || random() < 0.7)) || scenario === 'sudden';
    const dropAt = index === 0 ? 23 : 24 + Math.floor(random() * 5);
    for (let j = 0; j < 36; j++) {
      const decline = ['gradual', 'false_positive'].includes(scenario) ? clamp((j - 16) / 7) : scenario === 'recovering' ? clamp(1 - (j - 13) / 8) * (j >= 11 ? 1 : 0) : 0;
      let duration = patient.baseline_duration * (1 - 0.65 * decline) + (random() - 0.5) * 5;
      let engagement = patient.baseline_engagement - 45 * decline + (random() - 0.5) * 10;
      let status = decline > 0.55 ? 'shortened' : 'completed';
      let fatigue = scenario === 'fatigue' || decline > 0.5 ? 'high' : random() > 0.8 ? 'medium' : 'low';
      if ((scenario === 'intermittent' && random() < 0.22) || (willDrop && j >= dropAt) || (scenario === 'low_data' && j % 4 !== 0)) status = 'skipped';
      if (['schedule', 'gradual'].includes(scenario) && j >= 18 && status !== 'skipped' && random() < 0.6) status = 'late';
      if (scenario === 'sudden' && j >= dropAt - 2 && j < dropAt) { duration *= 0.75; engagement -= 12; fatigue = 'medium'; }
      if (status === 'skipped') { duration = 0; engagement = Math.max(20, engagement - 15); }
      patient.events.push({
        id: `${patient.id}-event-${j + 1}`, patient_id: patient.id, day: eventDay(j),
        occurred_at: new Date(START + eventDay(j) * DAY).toISOString(), status,
        duration_minutes: Math.round(clamp(duration, 0, 90) * 10) / 10,
        engagement: Math.round(clamp(engagement, 0, 100)), fatigue,
        difficulty: decline > 0.65 ? 'too-hard' : 'appropriate',
        quality: scenario === 'low_data' && j % 4 !== 0 ? 0.2 : 1, source: 'synthetic-generator'
      });
    }
    patients.push(patient);
  }
  return patients;
}

// Labels come from future generated events, never from model scores.
// One landmark per participant; no generated record is used for training.
export function validationRows(patients) {
  const rows = [];
  for (const patient of patients) {
    const observed = patient.events.filter(event => event.day <= LANDMARK_DAY);
    const score = assess(patient, observed);
    const completed = observed.filter(event => event.status !== 'skipped' && event.quality >= 0.6);
    const last = completed.at(-1);
    if (!score.available || !last || LANDMARK_DAY - last.day >= 7) continue;
    const future = patient.events.filter(event => event.day > LANDMARK_DAY && event.day <= LANDMARK_DAY + 7 && event.status !== 'skipped' && event.quality >= 0.6);
    const label = future.length === 0 ? 1 : 0;
    rows.push({
      participantId: patient.id, split: 'held_out', probability: score.score, label,
      ageGroup: patient.ageGroup, scenario: patient.scenario,
      monitoredMs: 7 * DAY, landmarkDay: LANDMARK_DAY,
      endpointDay: label ? last.day + 7 : null,
      features: score.features
    });
  }
  return rows;
}

export function validationSummary(patients, rows, threshold) {
  const metrics = evaluatePredictions(rows, { threshold });
  const leads = [];
  for (const row of rows.filter(row => row.label === 1)) {
    const patient = patients.find(patient => patient.id === row.participantId);
    const observed = patient.events.filter(event => event.day <= LANDMARK_DAY);
    const first = observed.find((event, index) => {
      if (event.day < LANDMARK_DAY - 14) return false;
      const signal = assess(patient, observed.slice(0, index + 1), threshold);
      return signal.available && signal.band === 'elevated';
    });
    if (first && row.endpointDay > first.day) leads.push(row.endpointDay - first.day);
  }
  leads.sort((a, b) => a - b);
  const reference = patients.map(patient => computeFeatures(patient, patient.events.slice(0, 6)));
  const current = rows.map(row => row.features);
  const drift = new DriftMonitor(reference, ['missedRate', 'durationRatio', 'engagementMean', 'lateRate']).evaluate(current);
  return {
    ...metrics, excluded: patients.length - rows.length,
    falseAlertsPerParticipantWeek: metrics.confusion.fp / rows.length,
    medianLeadDays: leads.length ? leads[Math.floor(leads.length / 2)] : null, leadDays: leads,
    flagsPerParticipantWeek: (metrics.confusion.tp + metrics.confusion.fp) / rows.length,
    alertedPositiveCount: leads.length,
    subgroups: subgroupReport(rows, 'ageGroup', { threshold }), drift
  };
}
