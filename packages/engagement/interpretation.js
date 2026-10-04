import { assess, mean } from './model.js';
import { DAY, START } from './cohort.js';

const valid = event => (event.quality ?? 1) >= 0.6;
const participating = event => valid(event) && event.status !== 'skipped';
const dayOf = event => (Date.parse(event.occurred_at) - START) / DAY;

// A retrospective endpoint from a complete generated record. Never fed into scoring.
export function disengagementEndpoint(events, programEndDay = 84) {
  const completed = events.filter(participating).sort((a,b) => Date.parse(a.occurred_at)-Date.parse(b.occurred_at));
  const recordEnd = Math.min(programEndDay, Math.max(0,...events.map(dayOf)));
  for (let i=0;i<completed.length;i++) {
    const day=dayOf(completed[i]),next=completed[i+1];
    if ((next && dayOf(next)-day>7) || (!next && recordEnd>=day+7)) return day+7;
  }
  return null;
}

export function signalHistory(patient, events, threshold) {
  return events.map((event,index)=>({event,day:dayOf(event),result:assess(patient,events.slice(0,index+1),threshold)}));
}

export function explainPatient(patient, events, threshold, { includeReferenceFuture = true } = {}) {
  const result=assess(patient,events,threshold),recent=events.slice(-6),baseline=events.slice(0,6).filter(valid);
  const last=events.at(-1),history=signalHistory(patient,events,threshold);
  const alert=history.find(item=>item.result.available&&item.result.band==='elevated')??null;
  const endpoint=includeReferenceFuture?disengagementEndpoint(patient.events):disengagementEndpoint(events,Math.max(84,...events.map(dayOf)));
  const warning=alert&&endpoint!==null&&alert.day<endpoint?{detectedDay:alert.day,endpointDay:endpoint,leadDays:endpoint-alert.day,retrospective:true}:null;
  const recentValid=recent.filter(valid),baselineComplete=baseline.filter(participating),recentComplete=recentValid.filter(participating);
  const baselineDuration=baselineComplete.length?mean(baselineComplete.map(e=>e.duration_minutes)):patient.baseline_duration;
  const duration=recentComplete.length?mean(recentComplete.map(e=>e.duration_minutes)):null;
  const durationChange=duration!==null&&baselineDuration?duration/baselineDuration-1:null;
  const missed=recentValid.filter(e=>e.status==='skipped').length,late=recentValid.filter(e=>e.status==='late').length;
  const baselineLate=baseline.filter(e=>e.status==='late').length;
  const engagementChange=baseline.length&&recentValid.length?mean(recentValid.map(e=>e.engagement))-mean(baseline.map(e=>e.engagement)):null;
  const scored=history.filter(item=>item.result.available),old=scored.at(-4),latest=scored.at(-1);
  const scoreChange=old&&latest?latest.result.score-old.result.score:0;
  const trend=!result.available?'Not enough history':scoreChange>.15?'Rapidly increasing':scoreChange>.04?'Increasing':scoreChange<-.04?'Decreasing':'Stable';
  const changes=[];
  if(durationChange!==null&&durationChange<-.15)changes.push('shorter sessions');
  if(missed)changes.push('missed activity');
  if(late>baselineLate)changes.push('later sessions');
  if(engagementChange!==null&&engagementChange<-10)changes.push('lower engagement');
  if(result.features.fatigueHighRate>.4)changes.push('reported fatigue');
  const changeText=changes.length?changes.slice(0,2).join(' + '):!result.available?'Limited usable observations':'Near established baseline';
  const chronology=[];
  const durationStart=history.find(item=>item.result.features.observedCount>=3&&item.result.features.durationRatio<.85);
  if(durationStart)chronology.push({day:durationStart.day,label:'Sustained duration decline',detail:'Recent session duration below 85% of the configured baseline.'});
  const lateStart=events.find(event=>valid(event)&&event.status==='late');
  if(lateStart)chronology.push({day:dayOf(lateStart),label:'Later session observed',detail:'The record marks a late session; no hourly delay is inferred.'});
  const missedStart=events.find(event=>valid(event)&&event.status==='skipped');
  if(missedStart)chronology.push({day:dayOf(missedStart),label:'Missed session observed',detail:'A scheduled event was recorded as skipped.'});
  if(alert)chronology.push({day:alert.day,label:'Review threshold crossed',detail:'Observed score '+alert.result.score.toFixed(3)+' reached the applicable threshold '+alert.result.effectiveThreshold.toFixed(3)+'.'});
  chronology.sort((a,b)=>a.day-b.day);
  const changedInputs=result.contributions.filter(item=>item.delta>.05).length;
  const narrative=!result.available?'There are not enough usable observations for a reviewable signal.':
    result.band==='elevated'?'A sustained change in '+changeText+' meets the configured review threshold.':
    result.band==='watch'?'A change in '+changeText+' is visible. The current signal remains below the review threshold.':
    'Recent participation is below the review threshold. Continue monitoring.';
  return {result,history,alert,endpoint,warning,last,trend,scoreChange,changes,changeText,narrative,changedInputs,chronology,
    baselineCount:baseline.length,baselineDuration,duration,durationChange,engagementChange,missed,late,
    recentCount:recentValid.length,windowCount:recent.length,observedDay:last?dayOf(last):0,
    qualityCoverage:result.features.coverage};
}

export function outcomeMetrics(decision, events) {
  if(!decision.outcome)return null;
  const anchor=Date.parse(decision.observationStart),end=anchor+7*DAY;
  const before=events.filter(e=>Date.parse(e.occurred_at)<=anchor).slice(-3).filter(valid);
  const after=events.filter(e=>Date.parse(e.occurred_at)>anchor&&Date.parse(e.occurred_at)<=end).filter(valid);
  const beforeCompleted=before.filter(participating),afterCompleted=after.filter(participating);
  const beforeDuration=mean(beforeCompleted.map(e=>e.duration_minutes)),afterDuration=mean(afterCompleted.map(e=>e.duration_minutes));
  const engagementDelta=mean(after.map(e=>e.engagement))-mean(before.map(e=>e.engagement));
  return {before,after,engagementDelta,beforeDuration,afterDuration,
    durationDelta:beforeDuration?afterDuration/beforeDuration-1:null,
    completed:after.filter(e=>e.status==='completed').length,
    participated:afterCompleted.length,
    observedResponse:engagementDelta>=5?'Improved engagement':engagementDelta<=-5?'Lower engagement':'No material engagement change'};
}
