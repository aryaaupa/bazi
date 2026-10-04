import test from 'node:test';
import assert from 'node:assert/strict';
import { Workspace, freshState, parseEventCsv, draftProtocol, STORAGE_KEY } from '../packages/engagement/workspace.js';
import { assess, fingerprint, MODEL, computeFeatures, scoreFeatures } from '../packages/engagement/model.js';
import { generateCohort, validationRows, validationSummary, START, DAY } from '../packages/engagement/cohort.js';
const memory=()=>{const values=new Map();return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
async function elevated(){const workspace=new Workspace();await workspace.initialize();assert.equal(workspace.assessment('BZ-001').band,'elevated');return workspace;}
const nextEvent=workspace=>{const patient=workspace.patient('BZ-001'),last=workspace.events(patient.id).at(-1);return{patient_id:patient.id,occurred_at:new Date(Date.parse(last.occurred_at)+2*DAY).toISOString(),status:'completed',duration_minutes:patient.baseline_duration,engagement:patient.baseline_engagement,fatigue:'low',difficulty:'appropriate',quality:1};};
test('cohort has deterministic 500 participants, 18,000 events, and nine archetypes',()=>{
  const a=generateCohort(),b=generateCohort();assert.deepEqual(a,b);assert.equal(a.length,500);assert.equal(a.reduce((sum,p)=>sum+p.events.length,0),18000);assert.equal(new Set(a.map(p=>p.scenario)).size,9);
});
test('scores use frozen coefficients and only the six most recent observations',()=>{
  const patient=generateCohort(1)[0],events=patient.events.slice(0,24);const f=computeFeatures(patient,events);
  assert.deepEqual(f,computeFeatures(patient,events.slice(-6)));
  const x=[f.missedRate,f.durationRatio,f.fatigueHighRate,f.tooHardRate,f.engagementSlope/20,f.engagementMean/100,f.volatility/25,f.lateRate];
  const linear=MODEL.bias+x.reduce((sum,value,index)=>sum+MODEL.weights[index]*value,0);
  assert.equal(scoreFeatures(f).score,1/(1+Math.exp(-linear)));
});
test('future values cannot leak into the observed score',()=>{
  const a=generateCohort(1)[0],b=structuredClone(a);b.events.slice(24).forEach(event=>{event.engagement=0;event.duration_minutes=0;});
  assert.equal(assess(a,a.events.slice(0,24)).score,assess(b,b.events.slice(0,24)).score);
});
test('low-quality observations cannot produce an actionable score',()=>{
  const patient=generateCohort(1)[0];assert.equal(assess(patient,patient.events.slice(0,2)).available,false);
  assert.equal(assess(patient,patient.events.slice(0,6).map(event=>({...event,quality:.2}))).band,'unavailable');
});
test('guided trajectory recalculates with actual events and crosses the review threshold',async()=>{
  const w=new Workspace();await w.startDemo();const before=w.assessment('BZ-001').score;let decision;
  for(let i=0;i<10;i++){decision=await w.advance('BZ-001');if(decision.status==='pending')break;}
  assert.equal(decision.status,'pending');assert.ok(decision.score>before);assert.equal(w.state.decisions.filter(d=>d.status==='pending').length,1);
});
test('disabled protocol blocks approvals, modifications, and new recommendations',async()=>{
  const w=await elevated(),decision=await w.evaluate('BZ-001');await w.setProtocol(false);
  await assert.rejects(w.review(decision.id,'approve'),/disabled/);await assert.rejects(w.review(decision.id,'modify',{actionId:'scheduling_support'}),/disabled/);
  assert.equal((await w.evaluate('BZ-001')).status,'disabled');await w.setProtocol(true);assert.equal((await w.evaluate('BZ-001')).status,'pending');
});
test('repeated evaluations are deduplicated and invalid actions are rejected',async()=>{
  const w=await elevated(),a=await w.evaluate('BZ-001'),b=await w.evaluate('BZ-001');assert.equal(a.id,b.id);
  await assert.rejects(w.review(a.id,'modify',{actionId:'change_treatment'}),/permitted/);assert.equal(a.status,'pending');
  await w.review(a.id,'modify',{actionId:'scheduling_support',note:'Synthetic scheduling preference'});assert.equal(a.status,'pending');assert.equal(a.actionId,'scheduling_support');
});
test('dismissals require a reason and Other requires a note',async()=>{
  const w=await elevated(),a=await w.evaluate('BZ-001');await assert.rejects(w.review(a.id,'dismiss',{reason:'Other'}),/reason/);
  await w.review(a.id,'dismiss',{reason:'Other',note:'Synthetic circumstance'});assert.equal(a.status,'dismissed');
});
test('snooze survives new events and reopens after its original review time',async()=>{
  let now=Date.parse('2026-10-04T12:00:00Z');const w=new Workspace({clock:()=>now});const a=await w.evaluate('BZ-001');await w.review(a.id,'snooze');const deadline=a.snoozedUntil;
  const b=await w.advance('BZ-001');assert.equal(b.status,'snoozed');assert.equal(b.snoozedUntil,deadline);await assert.rejects(w.review(b.id,'approve'),/snoozed/);
  now+=49*3600000;assert.equal((await w.evaluate('BZ-001')).status,'pending');
});
test('approval creates a follow-up gate and recovery uses recorded generated observations',async()=>{
  const w=await elevated(),a=await w.evaluate('BZ-001');await w.review(a.id,'approve');assert.equal(a.status,'approved');
  const b=await w.advance('BZ-001');assert.equal(b.status,'recovery_window');
  const before=w.events('BZ-001').length;await w.followUp(a.id);assert.equal(w.events('BZ-001').length,before+3);assert.equal(a.status,'followup_complete');assert.equal(a.outcome.causalConclusion,false);
  assert.ok(a.outcome.afterEngagement>a.outcome.beforeEngagement);await assert.rejects(w.followUp(a.id),/Approve/);
});
test('follow-up cannot occur before a provider approval',async()=>{
  const w=await elevated(),a=await w.evaluate('BZ-001');await assert.rejects(w.followUp(a.id),/Approve/);
});
test('CSV batch validation is transactional and rejects stale, duplicate, or invalid data',async()=>{
  const w=new Workspace(),before=w.events('BZ-001').length,event=nextEvent(w);
  await assert.rejects(w.ingestBatch([event,{...event,patient_id:'BZ-999999'}]),/not found/);assert.equal(w.events('BZ-001').length,before);
  await assert.rejects(w.ingestBatch([{...event,engagement:101}]),/Engagement/);
  await assert.rejects(w.ingestBatch([event,event]),/already exists/);assert.equal(w.events('BZ-001').length,before);
  await w.ingestBatch([event]);assert.equal(w.events('BZ-001').length,before+1);
  await assert.rejects(w.ingestBatch([event]),/already exists/);
});
test('CSV parsing handles quoted values, missing fields, and bounds',()=>{
  const header='patient_id,occurred_at,status,duration_minutes,engagement,fatigue,difficulty,quality\n';
  const rows=parseEventCsv(header+'"BZ-001","2026-10-01T14:00:00Z",completed,26,86,low,appropriate,1');assert.equal(rows[0].engagement,86);
  assert.throws(()=>parseEventCsv(header+'BZ-001,2026-10-01T14:00:00Z,completed,26,,low,appropriate,1'),/required/);
  assert.throws(()=>parseEventCsv(header+'BZ-001,2026-10-01T14:00:00Z,skipped,26,86,low,appropriate,1'),/zero/);
});
test('state persists across refresh and audit records form a verifiable hash chain',async()=>{
  const storage=memory(),w=new Workspace({storage});await w.initialize();await w.evaluate('BZ-001');const restored=new Workspace({storage});assert.deepEqual(restored.state,w.state);
  let previous='0'.repeat(64);for(const record of w.state.audit){const{hash,...payload}=record;assert.equal(payload.previousHash,previous);assert.equal(await fingerprint(payload),hash);previous=hash;}
  const changed=structuredClone(w.state.audit[0]);changed.detail.seed=999;const{hash,...payload}=changed;assert.notEqual(await fingerprint(payload),hash);
});
test('guidance resets cannot duplicate IDs belonging to other patients',async()=>{
  const w=await elevated();await w.evaluate('BZ-001');const other=w.list().find(p=>p.id!=='BZ-001'&&p.assessment.band==='elevated');await w.evaluate(other.id);
  await w.startDemo();await w.evaluate('BZ-001');assert.equal(new Set(w.state.decisions.map(d=>d.id)).size,w.state.decisions.length);
});
test('new synthetic participants begin with no actionable observations',async()=>{
  const w=new Workspace(),p=await w.createPatient({name:'<script>test</script>',scenario:'stable'});assert.equal(p.id,'BZ-501');assert.equal(w.events(p.id).length,0);assert.equal(w.assessment(p.id).available,false);assert.equal(p.scenario,'stable');
  await w.advance(p.id);await w.advance(p.id);await w.advance(p.id);assert.equal(w.assessment(p.id).available,true);
});
test('validation labels are future endpoints, not thresholded model outputs',()=>{
  const patients=generateCohort(),rows=validationRows(patients);assert.equal(rows.length,486);assert.ok(rows.some(row=>row.label===1&&row.probability<.7));assert.ok(rows.some(row=>row.label===0&&row.probability>=.7));
  const report=validationSummary(patients,rows,.7);assert.equal(report.confusion.tp+report.confusion.tn+report.confusion.fp+report.confusion.fn,rows.length);
  const fewer=validationSummary(patients,rows,.9);assert.ok(fewer.confusion.tp+fewer.confusion.fp<=report.confusion.tp+report.confusion.fp);
});
test('protocol export carries the draft status and frozen study controls',()=>{
  const text=draftProtocol({program:'Digital behavioral health',endpoint:'No activity for 7 days',horizon:7,observation:14,threshold:.7,minimumSessions:3});
  assert.match(text,/DRAFT/);assert.match(text,/no tuning on the held-out set/i);assert.match(text,/No diagnosis/);
});
