// Rehabilitation demo presentation only. Does not alter locked engagement model or event schema.
export const REHAB_DEMO_PATIENT_ID='BZ-001';
export const REHAB_WORKFLOW_VERSION='rehab-home-exercise-demo-v1';
export const REHAB_ACTIVITY='Home exercise session';
export const REHAB_STATUS=Object.freeze({completed:'Completed as planned',shortened:'Partially completed',late:'Completed later than planned',skipped:'Not completed'});
export function rehabSummary(events){
  const observed=events.filter(e=>['completed','shortened','late','skipped'].includes(e.status));
  const completed=observed.filter(e=>e.status==='completed'||e.status==='late').length;
  const partial=observed.filter(e=>e.status==='shortened').length;
  const skipped=observed.filter(e=>e.status==='skipped').length;
  return {total:observed.length,completed,partial,skipped,participationRate:observed.length?(completed+partial)/observed.length:null};
}
export function rehabEvent(values,occurredAt,patientId=REHAB_DEMO_PATIENT_ID){
  const status=String(values.status);
  if(!Object.hasOwn(REHAB_STATUS,status))throw new Error('Select a valid exercise participation status.');
  const duration=status==='skipped'?0:Number(values.duration);
  const engagement=Number(values.engagement);
  if(!Number.isFinite(duration)||duration<0||duration>180)throw new Error('Duration must be 0–180 minutes.');
  if(!Number.isFinite(engagement)||engagement<0||engagement>100)throw new Error('Engagement must be 0–100.');
  return {patient_id:patientId,occurred_at:occurredAt,status,duration_minutes:duration,engagement,fatigue:values.fatigue,difficulty:values.difficulty,quality:1};
}
