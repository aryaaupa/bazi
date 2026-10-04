import test from 'node:test';
import assert from 'node:assert/strict';
import { Workspace } from '../packages/engagement/workspace.js';
import { assess } from '../packages/engagement/model.js';
import { generateCohort, DAY, validationRows, validationSummary } from '../packages/engagement/cohort.js';
import { explainPatient, disengagementEndpoint, outcomeMetrics } from '../packages/engagement/interpretation.js';

test('index warning interval is derived from observed threshold crossing and future endpoint',()=>{
  const patient=generateCohort(1)[0],events=patient.events.slice(0,24),x=explainPatient(patient,events,.7);
  assert.equal(x.alert.day,53);assert.equal(x.endpoint,58);assert.equal(x.warning.leadDays,5);
  assert.equal(disengagementEndpoint(events),null);
  assert.equal(explainPatient(patient,events,.7,{includeReferenceFuture:false}).warning,null);
  assert.equal(x.missed,events.slice(-6).filter(e=>e.status==='skipped').length);
  assert.equal(x.trend,'Rapidly increasing');
});
test('future events cannot enter a partial-history explanation or score decomposition',()=>{
  const original=generateCohort(1)[0],changed=structuredClone(original),observed=original.events.slice(0,3);
  changed.events.slice(3).forEach(e=>{e.duration_minutes=0;e.engagement=0;e.status='skipped';});
  const a=assess(original,observed),b=assess(changed,observed);
  assert.equal(a.score,b.score);assert.deepEqual(a.contributions,b.contributions);
  const x=explainPatient(original,observed,.7),y=explainPatient(changed,observed,.7);
  assert.equal(x.baselineDuration,y.baselineDuration);assert.equal(x.changeText,y.changeText);
});
test('limited history and usable coverage raise the action threshold without changing frozen coefficients',()=>{
  const patient=generateCohort(1)[0],full=assess(patient,patient.events.slice(0,6),.7),short=assess(patient,patient.events.slice(0,3),.7);
  assert.equal(full.effectiveThreshold,.7);assert.ok(short.effectiveThreshold>.7);
  const noisy=patient.events.slice(0,6).map((e,i)=>({...e,quality:i<2?.2:1}));
  const partial=assess(patient,noisy,.7);assert.equal(partial.available,true);assert.ok(partial.effectiveThreshold>short.effectiveThreshold);
  const missing=assess(patient,noisy.map((e,i)=>({...e,quality:i<4?.2:1})),.7);
  assert.equal(missing.available,false);assert.equal(missing.band,'unavailable');
});
test('seven-day timeline simulation ingests chronological records and evaluates every new event',async()=>{
  const w=new Workspace(),before=w.events('BZ-001').length,day=w.events('BZ-001').at(-1).day;
  const expected=w.patient('BZ-001').events.slice(before).filter(e=>e.day<=day+7);
  const value=await w.advanceDays('BZ-001',7);
  assert.equal(value.ingested,expected.length);assert.equal(w.events('BZ-001').length,before+expected.length);
  assert.equal(w.state.audit.filter(r=>r.type==='event_ingested').length,expected.length);
  assert.equal(w.state.audit.filter(r=>r.type==='action_policy_evaluated').length,expected.length);
});
test('prepared reference records retain responders, nonresponders, dismissals, snoozes and no-action cases',async()=>{
  const w=new Workspace();await w.initialize();await w.prepareReferenceCases();
  const cases=w.state.referenceCases,records=w.state.decisions;
  const outcome=id=>records.find(d=>d.patientId===id&&d.outcome);
  assert.equal(outcomeMetrics(outcome(cases.recovery),w.events(cases.recovery)).observedResponse,'Improved engagement');
  assert.equal(outcomeMetrics(outcome(cases.no_change),w.events(cases.no_change)).observedResponse,'No material engagement change');
  assert.ok(records.some(d=>d.patientId===cases.dismissed&&d.status==='dismissed'&&d.reason==='Expected behavior'));
  assert.ok(records.some(d=>d.patientId===cases.snoozed&&d.status==='snoozed'));
  assert.equal(w.assessment(cases.low_data).available,false);
  assert.equal(w.assessment(cases.fatigue).band,'stable');
  assert.equal(w.assessment(cases.stable).band,'stable');
  const count=records.length,auditCount=w.state.audit.length;
  await w.prepareReferenceCases();assert.equal(records.length,count);assert.equal(w.state.audit.length,auditCount);
});
test('follow-up metrics stay anchored to approval even after the generated timeline moves ahead',async()=>{
  const w=new Workspace(),d=await w.evaluate('BZ-001');await w.review(d.id,'approve');
  const anchor=Date.parse(d.observationStart);await w.advanceDays('BZ-001',7);
  const count=w.events('BZ-001').length;await w.followUp(d.id,'recovery');
  assert.equal(w.events('BZ-001').length,count);assert.equal(Date.parse(d.outcome.windowEnd),anchor+7*DAY);
  const metrics=outcomeMetrics(d,w.events('BZ-001'));assert.equal(metrics.completed,0);
  assert.ok(metrics.after.every(e=>Date.parse(e.occurred_at)>anchor&&Date.parse(e.occurred_at)<=anchor+7*DAY));
  assert.notEqual(metrics.observedResponse,'Improved engagement');
});
test('validation snapshot burden and warning histogram are directly traceable to labeled rows',()=>{
  const patients=generateCohort(),rows=validationRows(patients),r=validationSummary(patients,rows,.7);
  assert.equal(r.count,486);assert.equal(r.prevalence,23/486);
  assert.equal(r.flagsPerParticipantWeek,(r.confusion.tp+r.confusion.fp)/rows.length);
  assert.equal(r.falseAlertsPerParticipantWeek,r.confusion.fp/rows.length);
  assert.equal(r.leadDays.length,r.alertedPositiveCount);assert.ok(r.leadDays.every(d=>d>0));
});
