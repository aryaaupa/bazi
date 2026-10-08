import test from 'node:test';
import assert from 'node:assert/strict';
import {rehabEvent,rehabSummary} from '../packages/engagement/rehab-demo.js';
import {Workspace} from '../packages/engagement/workspace.js';
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};
test('rehab adherence summary counts full partial and skipped without clinical claims',()=>{
 const result=rehabSummary([{status:'completed'},{status:'shortened'},{status:'skipped'},{status:'late'}]);
 assert.deepEqual(result,{total:4,completed:2,partial:1,skipped:1,participationRate:.75});
 assert.equal(rehabSummary([]).participationRate,null);
});
test('rehab skipped session forces zero minutes',()=>{
 const e=rehabEvent({status:'skipped',duration:42,engagement:20,fatigue:'high',difficulty:'too-hard'},'2026-10-22T18:00:00.000Z');
 assert.equal(e.duration_minutes,0);
});
test('patient home exercise writes the same observed history as clinician reads',async()=>{
 const storage=memory(),patient=new Workspace({storage});
 await patient.initialize();
 const old=patient.events('BZ-001').length;
 const last=Date.parse(patient.events('BZ-001').at(-1).occurred_at);
 const event=rehabEvent({status:'shortened',duration:12,engagement:45,fatigue:'high',difficulty:'too-hard'},new Date(last+86400000).toISOString());
 await patient.ingestBatch([event]);
 const clinician=new Workspace({storage});
 assert.equal(clinician.events('BZ-001').length,old+1);
 assert.equal(clinician.events('BZ-001').at(-1).duration_minutes,12);
 assert.equal(clinician.events('BZ-001').at(-1).difficulty,'too-hard');
});
test('rehab event rejects invalid duration',()=>assert.throws(()=>rehabEvent({status:'completed',duration:181,engagement:70},'2026-10-22T18:00:00Z')));
