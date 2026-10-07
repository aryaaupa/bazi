import { Workspace, ACTIONS, ACTION_SET_VERSION, DISMISS_REASONS, parseEventCsv, draftProtocol } from '../packages/engagement/workspace.js';
import { MODEL, fingerprint } from '../packages/engagement/model.js';
import { SEED, SCENARIO_LABELS, validationRows, validationSummary, START, DAY } from '../packages/engagement/cohort.js';
import { explainPatient, outcomeMetrics } from '../packages/engagement/interpretation.js';
import { evaluatePredictions, participantBootstrap } from '../sdk/src/validation.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const number = value => Number.isFinite(value) ? value.toLocaleString('en-US') : '—';
const decimal = (value, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : '—';
const percent = (value, digits = 0) => Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : '—';
const signed = (value, digits = 1) => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(digits)}` : '—';
const date = value => new Date(value).toLocaleDateString('en-US', { month:'short', day:'numeric', timeZone:'UTC' });
const time = value => new Date(value).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit', timeZone:'UTC' });
const initials = name => name.split(' ').map(part => part[0]).slice(0,2).join('');
const paths = {
  overview:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  queue:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  interventions:'M9 12l2 2 4-4M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4M9 2h6v4H9z',
  outcomes:'M4 19h16M6 15l4-4 4 3 6-8M15 6h5v5',
  analytics:'M3 3v18h18M7 14l4-4 4 3 5-7',
  pilot:'M8 3h8M10 3v6l-6 10a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M8 15h8',
  governance:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6',
  integrations:'M8 3v4M16 3v4M6 7h12v4a6 6 0 0 1-12 0zM12 17v4',
  audit:'M4 4h16v16H4zM8 8h8M8 12h8M8 16h4'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] ?? paths.overview}"/></svg>`;
const ROUTES = [['overview','Overview'],['queue','Patients'],['interventions','Interventions'],['outcomes','Outcomes'],['analytics','Validation'],['governance','Governance']];
const SECONDARY_ROUTES = [['pilot','Partner readiness'],['audit','Audit'],['integrations','Integrations']];
let storage;
try { storage = localStorage; } catch { storage = null; }
export const workspace = new Workspace({ storage });
let busy=false, route='overview', patientId='BZ-001', queuePage=0, showFuture=true;
let queueSearch='', queueBand='all', queueSort='risk', interventionFilter='pending';
let modalHandler=null, toastTimer=null, modelHash='', bootstrap=null;
const evaluationRows = validationRows(workspace.cohort);
let reportCache=null;
const report = () => {
  if (reportCache?.threshold !== workspace.state.threshold) reportCache=validationSummary(workspace.cohort,evaluationRows,workspace.state.threshold);
  return reportCache;
};
const badge = (label,color='gray') => `<span class="pill ${color}">${esc(label)}</span>`;
const bandBadge = result => badge(({elevated:'Review criteria met',watch:'Monitor closely',stable:'Routine monitoring',unavailable:'Insufficient evidence'})[result.band],({elevated:'amber',watch:'amber',stable:'green',unavailable:'gray'})[result.band]);
const stateLabel = status => ({pending:'Pending review',approved:'Approved',followup_complete:'Follow-up recorded',monitoring:'Monitoring',insufficient_data:'Insufficient data',disabled:'Engine paused',recovery_window:'Observation window',dismissed:'Dismissed',snoozed:'Snoozed 48h',superseded:'Superseded'})[status] ?? status;
const stateBadge = status => badge(stateLabel(status), status==='pending'?'amber':['approved','followup_complete'].includes(status)?'green':'gray');
const button = (label,action,options={}) => `<button class="button ${options.class ?? ''}" data-action="${action}"${options.id ? ` data-id="${esc(options.id)}"` : ''}${options.patient ? ` data-patient="${esc(options.patient)}"` : ''}${options.disabled ? ' disabled' : ''}>${label}</button>`;
const panel = (title,subtitle,body,action='',footer='') => `<section class="panel"><div class="panel-header"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${action}</div>${body}${footer ? `<div class="panel-footer">${footer}</div>` : ''}</section>`;
const heading = (eyebrow,title,subtitle,actions='') => `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;
const empty = (title,text,action='') => `<div class="empty-state"><h3>${title}</h3><p>${text}</p>${action}</div>`;
const actionName = id => ACTIONS.find(action=>action.id===id)?.label ?? id;
const patientLink = id => `#patient/${encodeURIComponent(id)}`;
const latestDecision = id => workspace.state.decisions.find(decision=>decision.patientId===id);
const explanation = patient => explainPatient(patient,workspace.events(patient.id),workspace.state.threshold,{includeReferenceFuture:!workspace.state.extraEvents[patient.id]?.length});
const metric = (label,value,note='') => `<div class="metric"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ''}</div>`;
function needsReview(patient) {
  if(!workspace.state.protocolEnabled || patient.assessment.band!=='elevated') return false;
  const decision=latestDecision(patient.id);
  return !decision || !['dismissed','snoozed','approved','recovery_window','followup_complete'].includes(decision.status);
}
function patientTable(patients,{review=false,selectable=false}={}) {
  if(!patients.length) return empty('No patients in this view','Change the filter or continue observing the current histories.');
  return `<div class="table-wrap"><table class="patient-table"><thead><tr>${selectable?'<th class="compare-check">Compare</th>':''}<th>Patient</th><th>Status</th><th>What changed</th><th>Observed lead time <small>retrospective</small></th><th>Next step</th></tr></thead><tbody>${patients.map(patient=>{
    const x=explanation(patient),decision=latestDecision(patient.id);
    const next=needsReview(patient)?'Review engagement support':decision?.status==='snoozed'?'Review after snooze':decision?.status==='dismissed'?'Dismissal recorded':decision?.status==='approved'?'Observe next 7 days':!x.result.available?'Collect usable observations':'Continue monitoring';
    return `<tr class="clickable">${selectable?`<td class="compare-check"><input type="checkbox" class="compare-select" data-patient="${patient.id}" aria-label="Compare ${esc(patient.name)}" ${compareIds.includes(patient.id)?'checked':''}></td>`:''}<td><a class="patient-name" href="${patientLink(patient.id)}">${esc(patient.name)}</a><small>${patient.id} · Digital behavioral health</small></td><td>${bandBadge(x.result)}</td><td>${esc(x.changeText)}</td><td>${x.warning ? `<strong>${decimal(x.warning.leadDays,0)} days</strong>` : '<span class="muted">Not observed</span>'}</td><td><a class="row-action" href="${patientLink(patient.id)}">${next}</a></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function overview() {
  const patients=workspace.list(),attention=patients.filter(needsReview).sort((a,b)=>a.id==='BZ-001'?-1:b.id==='BZ-001'?1:b.assessment.score-a.assessment.score);
  const insufficient=patients.filter(p=>!p.assessment.available).length;
  const observed=workspace.state.decisions.filter(d=>d.outcome).length,cases=workspace.state.referenceCases??{};
  const examples=[['stable','Stable participation','Below threshold; monitoring'],['fatigue','High fatigue, still participating','Fatigue alone does not imply disengagement'],['low_data','Limited usable observations','No actionable score'],['false_positive','Transient disruption','Generated false-positive archetype'],['recovery','Improvement after review','Recorded synthetic follow-up'],['no_change','No improvement after review','Recorded synthetic follow-up'],['dismissed','Provider declined support','Structured reason retained'],['snoozed','Review deferred','Original 48-hour deadline retained']];
  const elevated=patients.filter(p=>p.assessment.band==='elevated').length,watching=patients.filter(p=>p.assessment.band==='watch').length;
  const nextPatient=attention[0];
  const pulse=`<section class="command-pulse" aria-label="Operational pulse"><div class="pulse-copy"><span>ENGAGEMENT REVIEW</span><strong>${attention.length ? attention.length+' reviews waiting' : 'Queue clear'}</strong><p>${attention.length ? 'Prioritized from current observed histories. Provider action is required before any engagement support.' : 'No current histories require provider review.'}</p></div><div class="pulse-stats"><div><span>Review criteria met</span><strong>${elevated}</strong></div><div><span>Monitor closely</span><strong>${watching}</strong></div><div><span>Evidence limited</span><strong>${insufficient}</strong></div></div>${nextPatient?`<a class="review-next" href="${patientLink(nextPatient.id)}"><span>REVIEW NEXT</span><strong>${esc(nextPatient.name)}</strong><small>${esc(explanation(nextPatient).changeText)}</small></a>`:''}</section>`;
  return heading('DIGITAL BEHAVIORAL HEALTH','Engagement review queue','Records are prioritized by observed participation change and evidence sufficiency. Review the underlying history before recording any engagement-support decision.','<a class="button" href="#patient/BZ-001">Open Aadi Jain</a>')+pulse+
    `<section class="attention-section"><div class="section-heading"><div><h2><span class="attention-count">${attention.length}</span> records meet review criteria</h2><p>Current observations · base threshold ${decimal(workspace.state.threshold)} · provider decision required</p></div><a class="row-action" href="#queue">View all patients</a></div>${patientTable(attention.slice(0,5),{review:true})}${attention.length>5?`<p class="table-note">Showing five records; Aadi Jain is pinned first. Remaining records are ordered by the current observed signal. <a href="#queue">View the cohort</a>.</p>`:''}</section>
    <div class="metric-line">${metric('Participants',number(patients.length),'12-week generated records')}${metric('Limited evidence',insufficient,'No actionable score')}${metric('Follow-ups recorded',observed,'Seven-day synthetic windows')}</div>
    <section class="case-section"><div class="section-heading"><div><h2>Different histories. Different decisions.</h2><p>Recorded synthetic examples, including no action and no improvement.</p></div></div><div class="case-list">${examples.filter(([key])=>cases[key]).map(([key,title,note])=>`<a href="${patientLink(cases[key])}"><span>${title}</span><small>${note}</small></a>`).join('')}</div></section>`;
}
function queue() {
  let patients=workspace.list().filter(p=>`${p.name} ${p.id}`.toLowerCase().includes(queueSearch.toLowerCase())&&(queueBand==='all'||p.assessment.band===queueBand));
  patients.sort(queueSort==='name'?(a,b)=>a.name.localeCompare(b.name):(a,b)=>(b.assessment.available?b.assessment.score:-1)-(a.assessment.available?a.assessment.score:-1));
  queuePage=Math.min(queuePage,Math.max(0,Math.ceil(patients.length/15)-1));
  const start=queuePage*15;
  return heading('PARTICIPANT RECORDS','Patients','Observed participation and provider review across the synthetic cohort.',button('Add synthetic patient','create-patient'))+
    `<div class="toolbar"><input id="patient-search" class="search-input" type="search" placeholder="Search name or patient ID" aria-label="Search patients" value="${esc(queueSearch)}"><select id="band-filter" aria-label="Filter by signal"><option value="all">All statuses</option>${[['elevated','Elevated'],['watch','Watch'],['stable','Stable'],['unavailable','Insufficient data']].map(([v,label])=>`<option value="${v}" ${queueBand===v?'selected':''}>${label}</option>`).join('')}</select><span class="spacer"></span><select id="sort-patients" aria-label="Sort patients"><option value="risk">Review priority</option><option value="name" ${queueSort==='name'?'selected':''}>Name A–Z</option></select>${button('Export CSV','export-cohort',{class:'small subtle'})}</div>${compareIds.length?`<div class="compare-dock"><div><strong>${compareIds.length} selected</strong><span>Select 2–4 patients to compare observed inputs, derived features, and current signals.</span></div>${button('Compare patients','compare-open',{class:'primary',disabled:compareIds.length<2})}${button('Clear','compare-clear',{class:'subtle'})}</div>`:''}
    <section class="data-section">${patientTable(patients.slice(start,start+15),{selectable:true})}<div class="pagination"><span>${patients.length?start+1:0}–${Math.min(start+15,patients.length)} of ${number(patients.length)}</span><div class="action-row">${button('Previous','page-prev',{class:'small',disabled:queuePage===0})}${button('Next','page-next',{class:'small',disabled:start+15>=patients.length})}</div></div></section>`;
}
function trajectory(patient,events,decisions,x) {
  if(!events.length) return empty('No observations yet','Advance the timeline or add a synthetic observation.');
  const hasBranch=!!workspace.state.extraEvents[patient.id]?.length;
  const future=showFuture&&!hasBranch?patient.events.filter(e=>Date.parse(e.occurred_at)>Date.parse(events.at(-1).occurred_at)):[];
  const xmax=Math.max(84,x.observedDay),left=48,right=855,bottom=282,top=47;
  const xx=day=>left+day/xmax*(right-left),yy=value=>bottom-value/100*(bottom-top);
  const points=items=>items.map(([a,b])=>`${decimal(a,1)},${decimal(b,1)}`).join(' ');
  const warning=x.warning,approval=decisions.find(d=>d.approvedAt);
  const approvalDay=approval?(Date.parse(approval.observationStart)-START)/DAY:null;
  const warningVisible=warning&&(showFuture||warning.endpointDay<=x.observedDay);
  return `<svg class="chart trajectory-chart" viewBox="0 0 900 346" role="img" aria-label="12-week participation trajectory for ${esc(patient.name)} with observed sessions, review threshold, provider approval, and retrospective warning window">
    ${[0,25,50,75,100].map(v=>`<line x1="${left}" x2="${right}" y1="${yy(v)}" y2="${yy(v)}" class="gridline"/><text x="13" y="${yy(v)+4}" class="chart-label">${v}</text>`).join('')}
    ${[0,.25,.5,.75,1].map(v=>`<text x="${right+11}" y="${yy(v*100)+4}" class="chart-label">${v.toFixed(2)}</text>`).join('')}
    ${warningVisible?`<rect x="${xx(warning.detectedDay)}" y="${top}" width="${xx(warning.endpointDay)-xx(warning.detectedDay)}" height="${bottom-top}" fill="#f4e7c9" opacity=".75"/><path d="M${xx(warning.detectedDay)},31 v-9 H${xx(warning.endpointDay)} v9" fill="none" stroke="#9b762c"/><text x="${Math.min(xx(warning.detectedDay)-15,650)}" y="14" class="chart-label">Early warning window · ${decimal(warning.leadDays,0)} days</text><line x1="${xx(warning.endpointDay)}" x2="${xx(warning.endpointDay)}" y1="${top}" y2="${bottom}" stroke="#b1afa6" stroke-dasharray="3 4"/><text x="${Math.min(xx(warning.endpointDay)+7,723)}" y="${top+13}" class="chart-label">Synthetic disengagement endpoint</text>`:''}
    <line x1="${left}" x2="${right}" y1="${yy(workspace.state.threshold*100)}" y2="${yy(workspace.state.threshold*100)}" stroke="#c6b58c" stroke-dasharray="3 6"/>
    <text x="${right-150}" y="${yy(workspace.state.threshold*100)-7}" class="chart-label">Engagement review threshold</text>
    ${future.length?`<polyline points="${points([events.at(-1),...future].map(e=>[xx((Date.parse(e.occurred_at)-START)/DAY),yy(e.engagement)]))}" fill="none" stroke="#c5c4be" stroke-width="2" stroke-dasharray="4 6"/>`:''}
    <polyline points="${points(events.map(e=>[xx((Date.parse(e.occurred_at)-START)/DAY),yy(e.engagement)]))}" fill="none" stroke="#4d7665" stroke-width="2.5" stroke-linejoin="round"/>
    <polyline points="${points(x.history.filter(v=>v.result.available).map(v=>[xx(v.day),yy(v.result.score*100)]))}" fill="none" stroke="#b18c3d" stroke-width="1.8" stroke-dasharray="5 4"/>
    ${events.map(e=>{const a=xx((Date.parse(e.occurred_at)-START)/DAY),b=yy(e.engagement);return e.status==='skipped'?`<path d="M${a},${b-5} l5,9 h-10 z" fill="#ac685c"><title>Missed session · ${date(e.occurred_at)}</title></path>`:`<circle cx="${a}" cy="${b}" r="3.2" fill="#fff" stroke="#4d7665" stroke-width="1.4"><title>${e.status} · ${date(e.occurred_at)} · ${e.duration_minutes} minutes</title></circle>`;}).join('')}
    ${x.alert?`<path d="M${xx(x.alert.day)},${yy(x.alert.result.score*100)-6} l6,6 -6,6 -6,-6 z" fill="#b18c3d"><title>First review threshold crossing · ${date(x.alert.event.occurred_at)}</title></path>`:''}
    ${approval?`<line x1="${xx(approvalDay)}" x2="${xx(approvalDay)}" y1="${top}" y2="${bottom}" stroke="#4d7665" stroke-dasharray="2 4"/><circle cx="${xx(approvalDay)}" cy="${bottom+7}" r="4" fill="#4d7665"/><text x="${Math.min(xx(approvalDay)+7,730)}" y="${bottom+22}" class="chart-label">Provider approval</text>`:''}
    ${[0,14,28,42,56,70,84].map(day=>`<text x="${xx(day)-13}" y="329" class="chart-label">W${Math.min(12,Math.floor(day/7)+1)}</text>`).join('')}
    <text x="14" y="21" class="chart-label">Engagement index</text><text x="${right-62}" y="21" class="chart-label">Model signal</text>
  </svg>`;
}
function reviewBlock(patient,decision,x) {
  if(!decision) return `<p>Evaluate the observed history to record the policy decision.</p>${button('Evaluate current history','evaluate',{patient:patient.id,class:'primary'})}`;
  const stale=decision.threshold!==workspace.state.threshold||decision.status==='disabled'&&workspace.state.protocolEnabled;
  const reviewable=decision.status==='pending'&&x.result.band==='elevated'&&workspace.state.protocolEnabled&&!stale;
  const descriptions={
    pending:'A supportive check-in can help identify scheduling, usability, or participation barriers.',
    approved:'Provider approval is recorded. Observe participation during the next seven days.',
    followup_complete:'The approved observation window has a recorded synthetic follow-up.',
    monitoring:'No engagement action is recommended by the current policy.',
    insufficient_data:'Collect additional usable observations before considering engagement support.',
    disabled:'New recommendations and approvals are paused in Governance.',
    recovery_window:'An approved action is inside its seven-day observation window. Additional recommendations are held.',
    dismissed:`Provider feedback: ${decision.reason??'Dismissed'}.`,
    snoozed:`Deferred until ${date(decision.snoozedUntil)} at ${time(decision.snoozedUntil)} UTC.`
  };
  const action=ACTIONS.find(a=>a.id===decision.actionId);
  const approved=workspace.state.decisions.find(d=>d.patientId===patient.id&&d.status==='approved');
  const windowObserved=approved&&Date.parse(workspace.events(patient.id).at(-1)?.occurred_at)>=Date.parse(approved.observationStart)+7*DAY;
  return `${stateBadge(decision.status)}<h3>${['pending','approved','followup_complete','snoozed'].includes(decision.status)?esc(action?.label):decision.status==='insufficient_data'?'More evidence needed':'Continue observation'}</h3><p>${esc(descriptions[decision.status]??'A policy decision has been recorded.')}</p>
    ${decision.note?`<p class="provider-note"><strong>Provider note</strong><br>${esc(decision.note)}</p>`:''}
    ${stale?`<p class="technical-note">Settings changed since this decision. Re-evaluate before review.</p>${button('Re-evaluate current history','evaluate',{patient:patient.id,class:'small'})}`:''}
    ${reviewable?`<div class="review-actions"><div class="action-row">${button('Approve support','approve',{id:decision.id,class:'primary'})}${button('Modify','modify',{id:decision.id})}</div><div class="action-row review-tertiary">${button('Snooze 48h','snooze',{id:decision.id,class:'small subtle'})}${button('Dismiss','dismiss',{id:decision.id,class:'small subtle'})}</div></div>`:''}
    ${approved?`<div class="followup-actions"><span>Observe the next seven synthetic days</span><div class="action-row">${button('Advance follow-up','followup',{id:approved.id,class:'small'})}</div>${windowObserved?'':`<details class="synthetic-scenario"><summary>Synthetic scenario selection</summary><div>${button('Use no-improvement reference path','followup-no-change',{id:approved.id,class:'small subtle'})}</div></details>`}</div>`:''}
    <details class="action-details"><summary>Action rationale and manifest</summary><p>${esc(action?.purpose??'Monitoring only.')} This action asks about participation barriers. Bazi cannot autonomously modify treatment.</p><dl><div><dt>Action</dt><dd>${esc(decision.actionId)}</dd></div><div><dt>Action set</dt><dd>${esc(decision.policyVersion??ACTION_SET_VERSION)}</dd></div><div><dt>Authority</dt><dd>Recorded provider approval required</dd></div><div><dt>Delivery</dt><dd>Local synthetic record; no message sent</dd></div></dl></details>
    <p class="technical-note">${decision.id} · ${decision.modelVersion} · score ${decimal(decision.score,3)} at evaluation</p>`;
}
function patientDetail() {
  const patient=workspace.patient(patientId),events=workspace.events(patientId),x=explanation(patient),result=x.result;
  const decisions=workspace.state.decisions.filter(d=>d.patientId===patientId),decision=decisions[0],completed=decisions.find(d=>d.outcome);
  const cursor=workspace.state.cursors[patientId]??(patient.scenario==='low_data'?3:24),branched=!!workspace.state.extraEvents[patientId]?.length;
  const unavailable=cursor>=patient.events.length||branched;
  const contributors=result.contributions.filter(item=>item.delta>.01).map(item=>`<div class="contributor" data-contributor-index="${item.index}"><span>${esc(item.label)}</span><strong>+${decimal(item.delta)}</strong>${button('Explore scenario','counterfactual',{id:String(item.index),class:'small subtle counterfactual-trigger'})}</div>`).join('');
  const outcome=completed?outcomeMetrics(completed,events):null;
  return `<a class="back-link" href="#queue">Back to patients</a><div class="patient-title"><div><div class="eyebrow">DIGITAL BEHAVIORAL HEALTH · SYNTHETIC PATIENT</div><h1>${esc(patient.name)}</h1><p>${patient.id} · Week ${Math.min(12,Math.floor(x.observedDay/7)+1)} of 12 · ${x.last?date(x.last.occurred_at)+' observed':'No events observed'}</p></div><div class="heading-actions">${button('Advance patient timeline','advance',{patient:patientId,disabled:unavailable})}${button('Advance timeline by 7 days','advance-week',{patient:patientId,disabled:unavailable})}</div></div>
    <div class="patient-status"><div>${bandBadge(result)}<span class="trend">${esc(x.trend)}</span></div><p>${esc(x.narrative)}</p><div class="clinical-boundary"><strong>Decision support scope</strong><span>This record concerns participation and engagement support only. The signal does not estimate diagnosis, symptom severity, treatment response, or acute clinical risk.</span></div></div>
    <section class="case-snapshot" aria-label="Case snapshot"><div><span>ENGAGEMENT SIGNAL</span><strong>${result.available?decimal(result.score,3):'—'}</strong><small>${esc(stateLabel(decision?.status??(result.available?'monitoring':'insufficient_data')))}</small></div><div><span>WHAT MOVED</span><strong>${x.durationChange===null?'No duration baseline':signed(x.durationChange*100,0)+'% duration'}</strong><small>${x.missed} missed · ${x.late} late</small></div><div><span>WARNING WINDOW</span><strong>${x.warning?decimal(x.warning.leadDays,0)+' days':'Not observed'}</strong><small>Retrospective synthetic endpoint</small></div><div><span>PROVIDER CONTROL</span><strong>${decision?.status==='approved'?'Approved':decision?.status==='pending'?'Review required':'No action recorded'}</strong><small>Treatment cannot be changed autonomously</small></div></section>
    <section class="trajectory-section"><div class="section-heading"><div><h2>Participation over time</h2><p>Observed history drives the signal. The generated future is shown separately.</p></div>${button(showFuture?'Hide unobserved simulation':'Show unobserved simulation','toggle-future',{class:'small subtle',disabled:branched})}</div>${trajectory(patient,events,decisions,x)}
    <div class="legend"><span><i class="legend-line"></i>Observed engagement index</span><span><i class="legend-line amber"></i>Model signal (right axis)</span><span><i class="legend-diamond"></i>First review threshold crossing</span><span><i class="legend-triangle"></i>Missed session</span>${showFuture&&!branched?'<span><i class="legend-line gray"></i>Unobserved synthetic events</span>':''}</div>
    <div class="trajectory-context"><span>Reference signal <strong>${result.available?decimal(result.score,3):'unavailable'}</strong></span><span>Usable recent observations <strong>${result.features.observedCount}/${result.features.windowCount}</strong></span><span>Warning lead time <strong>${x.warning?decimal(x.warning.leadDays,0)+' days':'Not observed'}</strong> <small>retrospective simulation</small></span></div>
    <p class="technical-note">The shaded interval, when available, runs from the first observed review flag to the generated seven-day inactivity endpoint. Future records are excluded from current scoring.${branched?' This record now follows an added observation branch; the original unobserved trajectory is hidden.':''} The score is a research signal; clinical probability and confidence are unestablished.</p></section>
    <div class="patient-evidence-grid"><section class="evidence-section"><div class="section-heading"><h2>What changed?</h2><span class="muted">Recent six events vs. observed baseline</span></div><div class="behavior-grid">
    ${metric('Session duration',x.durationChange===null?'—':signed(x.durationChange*100,0)+'%',x.duration!==null?decimal(x.duration,1)+' min · baseline '+decimal(x.baselineDuration,1)+' min':'No usable participating sessions')}
    ${metric('Missed activity',x.missed,x.recentCount+' usable recent observations')}
    ${metric('Late sessions',x.late,'Observed status; no delay inferred')}
    ${metric('Engagement',signed(x.engagementChange,0)+' pts','Relative to first usable observations')}</div>
    <details class="why-now" open><summary>Why now?</summary><p>${esc(x.narrative)}</p><ol class="chronology">${x.chronology.map(event=>`<li><span>Day ${decimal(event.day+1,0)}</span><div><strong>${esc(event.label)}</strong><p>${esc(event.detail)}</p></div></li>`).join('')||'<li><p>No review threshold crossing has been observed. Continue collecting usable events.</p></li>'}</ol></details>
    <section class="ai-synthesis" aria-labelledby="ai-synthesis-title"><div class="ai-synthesis-head"><div><span>OPTIONAL AI SYNTHESIS</span><h3 id="ai-synthesis-title">Evidence summary</h3></div>${button('Generate summary','ai-synthesis',{patient:patientId,class:'small'})}</div><p>Summarizes the synthetic evidence already shown on this page. It cannot change the engagement signal, threshold, action policy, or provider decision.</p><div id="ai-synthesis-result" class="ai-synthesis-result" aria-live="polite"><span>Not generated</span><p>The deterministic record remains authoritative.</p></div></section>
    <details class="risk-details"><summary>Signal contributors and baseline scenarios</summary><p class="technical-note">Additive changes in model log-odds relative to the first six observed events. These are model sensitivities, not causal effects.</p>${contributors||'<p class="muted">No material positive contribution or insufficient usable evidence.</p>'}<div id="counterfactual-result" class="counterfactual-result" aria-live="polite" tabindex="-1"></div></details></section>
    <aside class="review-section"><div class="eyebrow">PROVIDER REVIEW</div><h2>Engagement-support decision</h2><p class="review-scope">Confirm the observed history and evidence sufficiency before acting. Clinical assessment, treatment decisions, and urgent-risk workflows remain outside this system.</p>${reviewBlock(patient,decision,x)}</aside></div>
    <section class="patient-notes"><div class="section-heading"><div><h2>Care-team notes</h2><p>Local synthetic workspace notes. Notes do not affect scoring.</p></div>${button('Add note','add-note',{patient:patientId,class:'small'})}</div><div class="note-list">${workspace.notes(patientId).length?workspace.notes(patientId).map(note=>`<article class="patient-note"><div><strong>${esc(note.author)}</strong><span>${date(note.at)} · ${time(note.at)} UTC</span></div><p>${esc(note.text)}</p>${button('Delete','delete-note',{id:note.id,patient:patientId,class:'small subtle'})}</article>`).join(''):'<p class="muted">No notes recorded for this patient.</p>'}</div></section>
    <div class="record-bottom"><section class="quality-section"><h2>Evidence sufficiency</h2><dl class="facts"><div><dt>Usable recent observations</dt><dd>${result.features.observedCount} of ${result.features.windowCount}</dd></div><div><dt>Coverage</dt><dd>${percent(result.features.coverage)}</dd></div><div><dt>Applicable review threshold</dt><dd>${decimal(result.effectiveThreshold,3)}${result.thresholdAdjustment>0?` <small>base ${decimal(result.baseThreshold)} + evidence adjustment</small>`:''}</dd></div><div><dt>Clinical uncertainty</dt><dd>Not quantified</dd></div></dl><p class="technical-note">${!result.available?'At least three usable observations and 60% usable coverage are required.':result.thresholdAdjustment>0?'Limited history or quality raises the review threshold. This is an evidence gate, not a confidence estimate.':'A full usable six-event window meets the reference evidence gate.'} ${x.baselineCount} usable events establish the observed explanation baseline.</p><div class="action-row">${button('Add observation','add-event',{patient:patientId,class:'small'})}${button('Evaluate current history','evaluate',{patient:patientId,class:'small subtle'})}${patientId==='BZ-001'?button('Replay from baseline','start-demo',{class:'small subtle'}):''}</div></section>
    ${outcome?`<section class="quality-section"><h2>Recorded follow-up</h2><p><strong>${outcome.observedResponse}</strong></p><div class="metric-line compact">${metric('Engagement',signed(outcome.engagementDelta)+' pts')}${metric('Completed sessions',outcome.completed+' / '+outcome.after.length)}</div><p class="technical-note">${completed.id} · ${date(completed.outcome.windowStart??completed.observationStart)}–${date(completed.outcome.windowEnd??Date.parse(completed.observationStart)+7*DAY)}. A generated before/after comparison does not establish an intervention effect.</p><a class="row-action" href="#outcomes">Inspect follow-up records</a></section>`:''}</div>
    <details class="history-section"><summary>Observed session history <span>${events.length} events</span></summary><div class="table-wrap"><table><thead><tr><th>Date</th><th>Status</th><th>Duration</th><th>Engagement</th><th>Fatigue</th><th>Quality</th><th>Source</th></tr></thead><tbody>${events.slice().reverse().map(e=>`<tr><td>${date(e.occurred_at)}</td><td>${badge(e.status,e.status==='skipped'?'rose':'gray')}</td><td>${decimal(e.duration_minutes,1)} min</td><td>${e.engagement}</td><td>${esc(e.fatigue)}</td><td>${percent(e.quality??1)}</td><td>${esc(e.source)}</td></tr>`).join('')}</tbody></table></div>${button('Export observed events','export-events',{patient:patientId,class:'small subtle'})}</details>`;
}
function interventions() {
  const filtered=workspace.state.decisions.filter(d=>interventionFilter==='all'||(interventionFilter==='pending'?['pending','snoozed'].includes(d.status):['approved','followup_complete'].includes(d.status)));
  return heading('RECORDED PROVIDER DECISIONS','Interventions','Review permitted engagement actions and retain the reason for each decision.')+
    `<div class="toolbar"><div class="tabs">${[['pending','Pending review'],['approved','Approved / observed'],['all','All decisions']].map(([id,label])=>`<button class="tab ${interventionFilter===id?'active':''}" data-action="intervention-filter" data-id="${id}">${label}</button>`).join('')}</div><span class="spacer"></span>${button('Export decisions','export-decisions',{class:'small subtle'})}</div><section class="data-section">${filtered.length?`<div class="table-wrap"><table><thead><tr><th>Patient</th><th>Action / policy</th><th>Observed score</th><th>Status</th><th>Provider feedback</th></tr></thead><tbody>${filtered.map(d=>`<tr><td><a class="patient-name" href="${patientLink(d.patientId)}">${esc(workspace.patient(d.patientId).name)}</a><small>${d.patientId} · ${d.id}</small></td><td>${['pending','approved','followup_complete','snoozed'].includes(d.status)?esc(actionName(d.actionId)):'Monitor / no action'}<small>${date(d.at)} · ${esc(d.policyVersion??ACTION_SET_VERSION)}</small></td><td>${decimal(d.score,3)}</td><td>${stateBadge(d.status)}</td><td>${esc(d.reason??d.note??'')||'—'}</td></tr>`).join('')}</tbody></table></div>`:empty('No decisions in this view','Open a patient and evaluate the current history.')}</section><p class="technical-note">Provider approval creates a local synthetic record. An active seven-day observation window holds additional recommendations. The current engine never modifies a treatment plan or sends outreach.</p>`;
}
function outcomes() {
  const observed=workspace.state.decisions.filter(d=>d.outcome);
  return heading('OBSERVATION AFTER REVIEW','Outcomes','Inspect what was observed after a recorded provider decision, including no improvement.',button('Export decision records','export-decisions',{class:'small'}))+
    '<p class="validation-note">Synthetic follow-ups compare recorded participation before and after approval. They do not demonstrate clinical benefit or causal intervention effects.</p>'+
    (observed.length?`<div class="outcome-list">${observed.map(d=>{
      const p=workspace.patient(d.patientId),m=outcomeMetrics(d,workspace.events(p.id));
      const repeated=workspace.state.decisions.filter(item=>item.patientId===p.id&&item.id!==d.id&&item.status==='pending'&&Date.parse(item.observationStart)>=Date.parse(d.observationStart)&&Date.parse(item.observationStart)<=Date.parse(d.observationStart)+7*DAY).length;
      return `<section class="outcome-record"><div class="section-heading"><div><h2><a href="${patientLink(p.id)}">${esc(p.name)}</a></h2><p>${d.id} · ${esc(actionName(d.actionId))} · ${date(d.observationStart)}–${date(Date.parse(d.observationStart)+7*DAY)}</p></div>${badge(m.observedResponse,m.engagementDelta>=5?'green':m.engagementDelta<=-5?'rose':'gray')}</div><div class="metric-line">${metric('Engagement change',signed(m.engagementDelta)+' pts')}${metric('Session duration',m.durationDelta===null?'—':signed(m.durationDelta*100,0)+'%')}${metric('Completed sessions',m.completed+' / '+m.after.length)}${metric('New pending flags',repeated)}</div><p class="technical-note">${m.before.length} usable observations before approval; ${m.after.length} in the seven-day window. ${m.participated} follow-up observations include participation (completed, late, or shortened). Outcome: ${m.observedResponse.toLowerCase()}. Follow-up source: ${d.outcome.response==='recorded_history'?'already observed history':d.outcome.response==='recovery'?'generated improvement scenario':'generated no-improvement scenario'}. <a href="${patientLink(p.id)}">View the event history →</a></p></section>`;
    }).join('')}</div>`:empty('No recorded follow-ups','Approve an engagement recommendation, then observe or simulate its seven-day follow-up.'))+
    '<p class="technical-note">Responders and nonresponders are both retained. The cohort validation endpoint is measured independently from future generated participation records.</p>';
}


const thresholdCurve=Array.from({length:41},(_,i)=>evaluatePredictions(evaluationRows,{threshold:i/40}));
function axes(xlabel,ylabel,{maxX=1}={}) {
  return `${[0,.25,.5,.75,1].map(v=>`<line x1="45" x2="405" y1="${212-v*165}" y2="${212-v*165}" class="gridline"/><text x="10" y="${216-v*165}" class="chart-label">${v.toFixed(2)}</text><text x="${40+v*360}" y="233" class="chart-label">${decimal(v*maxX,2)}</text>`).join('')}<text x="175" y="257" class="chart-label">${xlabel}</text><text x="45" y="22" class="chart-label">${ylabel}</text>`;
}
function prCurve() {
  const sorted=[...evaluationRows].sort((a,b)=>b.probability-a.probability),positives=sorted.filter(r=>r.label===1).length;
  let tp=0,fp=0;const points=[[0,1]];
  sorted.forEach(r=>{r.label?tp++:fp++;points.push([tp/positives,tp/(tp+fp)]);});
  return `<svg class="chart" viewBox="0 0 450 270" role="img" aria-label="Precision-recall curve calculated from eligible synthetic participant scores">${axes('Recall','Precision')}<line x1="45" x2="405" y1="${212-report().prevalence*165}" y2="${212-report().prevalence*165}" stroke="#b9a37a" stroke-dasharray="4 5"/><polyline points="${points.map(([x,y])=>`${45+x*360},${212-y*165}`).join(' ')}" fill="none" stroke="#4d7665" stroke-width="2"/></svg>`;
}
function calibrationChart() {
  return `<svg class="chart" viewBox="0 0 450 270" role="img" aria-label="Synthetic calibration bins comparing mean model scores with observed disengagement rates">${axes('Mean reference signal','Observed endpoint rate')}<line x1="45" y1="212" x2="405" y2="47" stroke="#bfbdb4" stroke-dasharray="4 5"/>${report().calibration.bins.map(b=>`<circle cx="${45+b.meanProbability*360}" cy="${212-b.observedRate*165}" r="${Math.min(11,3+Math.sqrt(b.count)/2)}" fill="#4d7665" opacity=".75"><title>n=${b.count}; mean score ${decimal(b.meanProbability,3)}; observed ${percent(b.observedRate,1)}</title></circle>`).join('')}</svg>`;
}
function burdenChart(threshold=workspace.state.threshold) {
  const current=evaluatePredictions(evaluationRows,{threshold});
  return `<svg class="chart" viewBox="0 0 450 270" role="img" aria-label="Sensitivity versus review burden in a single-landmark synthetic evaluation">${axes('Review flags / participant-week','Sensitivity')}<polyline points="${[...thresholdCurve].reverse().filter(r=>Number.isFinite(r.sensitivity)).map(r=>`${45+(r.confusion.tp+r.confusion.fp)/r.count*360},${212-r.sensitivity*165}`).join(' ')}" fill="none" stroke="#4d7665" stroke-width="2"/><circle cx="${45+(current.confusion.tp+current.confusion.fp)/current.count*360}" cy="${212-current.sensitivity*165}" r="5" fill="#b18c3d" stroke="#fff" stroke-width="2"><title>Threshold ${decimal(threshold)} · ${percent(current.sensitivity)} sensitivity</title></circle></svg>`;
}
function barChart(values,{label,bins=8,maximum=16}={}) {
  const counts=Array(bins).fill(0);values.forEach(v=>counts[Math.min(bins-1,Math.floor(v/maximum*bins))]++);
  const peak=Math.max(1,...counts),width=360/bins;
  return `<svg class="chart" viewBox="0 0 450 270" role="img" aria-label="${label}">${[0,.5,1].map(v=>`<line x1="45" x2="405" y1="${212-v*165}" y2="${212-v*165}" class="gridline"/><text x="10" y="${216-v*165}" class="chart-label">${Math.round(peak*v)}</text>`).join('')}${counts.map((n,i)=>`<rect x="${49+i*width}" y="${212-n/peak*165}" width="${width-10}" height="${n/peak*165}" fill="#8c9b92"><title>${decimal(i*maximum/bins,1)}–${decimal((i+1)*maximum/bins,1)}: ${n} records</title></rect><text x="${48+i*width}" y="233" class="chart-label">${decimal(i*maximum/bins,maximum<=1?1:0)}</text>`).join('')}<text x="172" y="257" class="chart-label">${label}</text></svg>`;
}
function thresholdPreview(value) {
  const r=validationSummary(workspace.cohort,evaluationRows,value);
  $('#threshold-value').textContent=decimal(value);
  $('#trade-sensitivity').textContent=percent(r.sensitivity);
  $('#trade-specificity').textContent=percent(r.specificity);
  $('#trade-burden').textContent=decimal(r.flagsPerParticipantWeek,3);
  $('#trade-false').textContent=decimal(r.falseAlertsPerParticipantWeek,3);
  $('#trade-lead').textContent=r.medianLeadDays===null?'—':decimal(r.medianLeadDays,1)+' days';
  $('#trade-lead-count').textContent=r.alertedPositiveCount+' alerted positive records';
  $('#trade-count').textContent=(r.confusion.tp+r.confusion.fp)+' flags · '+r.confusion.fp+' false positives';
  $('#burden-chart').innerHTML=burdenChart(value);
}
function analytics() {
  const r=report(),c=r.confusion;
  return heading('SYNTHETIC BENCHMARK','Synthetic benchmark','This deterministic benchmark demonstrates the evaluation framework. It is intended to support future retrospective validation and is not clinical performance.',button('Export benchmark JSON','export-validation',{class:'small'}))+
    `<div class="metric-line validation-context">${metric('Generated participants',workspace.cohort.length,'12-week records')}${metric('Eligible landmarks',r.count,r.excluded+' excluded')}${metric('Endpoint prevalence',percent(r.prevalence,2),(c.tp+c.fn)+' / '+r.count+' at the seven-day horizon')}</div>
    <section class="threshold-section"><div class="section-heading"><div><h2>Review threshold</h2><p>Can the signal provide useful warning time without unacceptable review burden?</p></div><strong class="threshold-number" id="threshold-value">${decimal(workspace.state.threshold)}</strong></div><input id="threshold-slider" class="threshold-slider" type="range" min="0.20" max="0.95" step="0.01" value="${workspace.state.threshold}" aria-label="Review threshold"><div class="threshold-ends"><span>0.20 · More reviews</span><span>0.95 · Fewer reviews</span></div><div class="tradeoff-metrics"><div class="metric"><span>Sensitivity</span><strong id="trade-sensitivity">${percent(r.sensitivity)}</strong></div><div class="metric"><span>Specificity</span><strong id="trade-specificity">${percent(r.specificity)}</strong></div><div class="metric"><span>AUPRC</span><strong>${decimal(r.auprc,3)}</strong></div><div class="metric"><span>Review flags / patient-week</span><strong id="trade-burden">${decimal(r.flagsPerParticipantWeek,3)}</strong><small id="trade-count">${c.tp+c.fp} flags · ${c.fp} false positives</small></div><div class="metric"><span>False alerts / patient-week</span><strong id="trade-false">${decimal(r.falseAlertsPerParticipantWeek,3)}</strong></div><div class="metric"><span>Median warning lead time</span><strong id="trade-lead">${r.medianLeadDays===null?'—':decimal(r.medianLeadDays,1)+' days'}</strong><small id="trade-lead-count">${r.alertedPositiveCount} alerted positive records</small></div></div><p class="technical-note">Operational thresholds should be agreed with the clinical partner and frozen before evaluation. Releasing the slider updates this synthetic workspace’s base review threshold. Patient review also applies evidence-quality gates.</p></section>
    <div class="validation-charts"><section><h2>Review burden vs. sensitivity</h2><div id="burden-chart">${burdenChart()}</div><p class="technical-note">One landmark per eligible participant with a seven-day follow-up. This normalized snapshot burden is not a prospective repeated-alert rate.</p></section><section><h2>Precision–recall</h2>${prCurve()}<p class="technical-note">Dashed line: ${percent(r.prevalence,2)} endpoint prevalence.</p></section><section><h2>Calibration</h2>${calibrationChart()}<p class="technical-note">Marker size reflects bin count. The diagonal represents perfect calibration; the score is not a clinical probability.</p></section><section><h2>Warning lead-time distribution</h2>${barChart(r.leadDays,{label:'Warning lead time (days)',bins:8,maximum:16})}<p class="technical-note">Time from the first threshold crossing in the 14-day lookback to the generated inactivity endpoint, for ${r.alertedPositiveCount} alerted positive records.</p></section><section><h2>Reference-score distribution</h2>${barChart(evaluationRows.map(row=>row.probability),{label:'Reference signal',bins:10,maximum:1})}<p class="technical-note">${r.count} eligible participant snapshots; future events define outcome labels independently of the score.</p></section><section class="validation-method"><h2>Evaluation and provenance</h2><dl class="facts"><div><dt>Artifact</dt><dd>${MODEL.version}</dd></div><div><dt>AUROC</dt><dd>${decimal(r.auroc,3)}</dd></div><div><dt>AUPRC</dt><dd>${decimal(r.auprc,3)}</dd></div><div><dt>Brier score</dt><dd>${decimal(r.brierScore,3)}</dd></div><div><dt>Expected calibration error</dt><dd>${decimal(r.calibration.expectedCalibrationError,3)}</dd></div></dl><p class="technical-note">Fixed seed ${SEED}. One landmark on program day 54; seven future days define the endpoint. Already-disengaged and insufficient-data records are excluded. The artifact is neither trained nor tuned on this cohort.</p>${button(bootstrap?'Recompute participant intervals':'Compute participant intervals','bootstrap',{class:'small'})}${bootstrap?`<p class="technical-note">100 participant bootstrap resamples. AUROC 95% interval: ${decimal(bootstrap.auroc.lower)}–${decimal(bootstrap.auroc.upper)}. AUPRC: ${decimal(bootstrap.auprc.lower)}–${decimal(bootstrap.auprc.upper)}.</p>`:''}</section></div>
    <section class="subgroup-section"><div class="section-heading"><div><h2>Performance by generated subgroup</h2><p>Synthetic age strata illustrate reporting; they do not establish fairness.</p></div></div><div class="table-wrap"><table><thead><tr><th>Age group</th><th>N</th><th>Sensitivity</th><th>Specificity</th><th>AUPRC</th></tr></thead><tbody>${Object.entries(r.subgroups).map(([name,v])=>`<tr><td>${name}</td><td>${v.count}</td><td>${percent(v.sensitivity)}</td><td>${percent(v.specificity)}</td><td>${decimal(v.auprc,3)}</td></tr>`).join('')}</tbody></table></div><p class="technical-note">Real subgroup conclusions require adequate sample sizes and uncertainty estimates.</p></section>
    <details class="risk-details"><summary>Feature drift against the generated baseline</summary><div class="table-wrap"><table><thead><tr><th>Feature</th><th>Population stability index</th><th>Standardized shift</th><th>State</th></tr></thead><tbody>${r.drift.features.map(f=>`<tr><td>${esc(f.name)}</td><td>${decimal(f.psi,3)}</td><td>${decimal(f.standardizedMeanShift)}</td><td>${f.drift?'Shift observed':'Within reference'}</td></tr>`).join('')}</tbody></table></div><p class="technical-note">Expected changes in generated trajectories. Drift calculations do not indicate production model health.</p></details>`;
}
function pilot() {
  const p=workspace.state.pilot??{};
  const gates=[
    ['Clinical use case','Define','Choose one care program and the operational engagement problem worth solving.'],
    ['Data feasibility','Assess','Confirm event provenance, timestamp quality, missingness, endpoint availability, and cohort size.'],
    ['Evaluation protocol','Freeze','Pre-specify population, endpoint, splits, metrics, subgroup analyses, failure criteria, and stopping rules before outcome analysis.'],
    ['Retrospective validation','Evaluate','Run the frozen artifact on governed historical records with participant-level holdout and independent review.'],
    ['Workflow feasibility','Observe','If evidence supports continuation, evaluate a silent prospective workflow before patient-facing use.']
  ];
  return heading('PARTNER READINESS','From product demonstration to governed evidence','Bazi is ready to scope a narrow clinical collaboration. The next step is not deployment; it is agreeing on the use case, available evidence, and a validation plan.')+
    `<section class="partner-hero"><div><span>COLLABORATION OBJECTIVE</span><h2>Validate one engagement problem well.</h2><p>Start with a single care program where participation change is operationally meaningful. Define what the care team would need to know, what data already exist, and what result would justify moving forward.</p></div><aside><span>PROPOSED FIRST STUDY</span><strong>Retrospective validation</strong><p>De-identified historical records · no patient-facing decisions · jointly defined endpoint · frozen evaluation protocol</p></aside></section>
    <section class="partner-question"><span>CORE QUESTION</span><h2>Can longitudinal participation change provide useful warning time without creating unacceptable review burden?</h2></section>
    <section class="partner-path"><div class="section-heading"><div><h2>Evidence path</h2><p>Each stage has a decision gate. Later stages are conditional, not assumed.</p></div></div><ol>${gates.map(([title,state,text],i)=>`<li><span class="partner-step">0${i+1}</span><div><strong>${title}</strong><p>${text}</p></div><em>${state}</em></li>`).join('')}</ol></section>
    <div class="pilot-grid"><section><h2>Minimum data for feasibility review</h2><ul class="plain-list"><li>Pseudonymous participant identifier</li><li>Timestamped engagement events and scheduled activity</li><li>Completion state, duration, and other observable participation measures</li><li>A jointly defined operational disengagement endpoint and censoring information</li><li>Data dictionary, provenance, missingness, and relevant program changes</li></ul><p class="technical-note">A feasibility review does not require clinical notes, treatment recommendations, autonomous intervention, or production deployment. The final data specification should follow the minimum-necessary principle for the agreed research question.</p><h2 class="section-spaced">Decision gates</h2><dl class="facts"><div><dt>Continue only if</dt><dd>Endpoint is meaningful and measurable; data quality is adequate; evaluation is feasible</dd></div><div><dt>Do not advance if</dt><dd>Evidence quality, subgroup support, review burden, safety, or workflow fit fails pre-specified criteria</dd></div><div><dt>Patient-facing use</dt><dd>Not part of the proposed retrospective phase</dd></div></dl></section>
    <section class="study-config"><h2>Draft collaboration protocol</h2><p class="technical-note">This builder creates a discussion draft only. A partner-approved protocol would be versioned and frozen separately before analysis.</p><form id="pilot-form"><div class="form-grid"><div class="field full"><label for="pilot-program">Care program</label><input id="pilot-program" name="program" required maxlength="100" value="${esc(p.program??'Digital behavioral health')}"></div><div class="field full"><label for="pilot-endpoint">Candidate operational endpoint</label><select id="pilot-endpoint" name="endpoint"><option>No valid engagement event for 7 consecutive days</option></select></div><div class="field"><label for="pilot-horizon">Candidate warning horizon</label><select id="pilot-horizon" name="horizon">${[3,7,14].map(v=>`<option value="${v}" ${Number(p.horizon??7)===v?'selected':''}>${v} days</option>`).join('')}</select></div><div class="field"><label for="pilot-observation">Candidate observation window</label><select id="pilot-observation" name="observation">${[7,14,28].map(v=>`<option value="${v}" ${Number(p.observation??14)===v?'selected':''}>Previous ${v} days</option>`).join('')}</select></div><div class="field"><label for="pilot-threshold">Exploratory review threshold</label><input id="pilot-threshold" name="threshold" type="number" required min="0.2" max="0.95" step="0.01" value="${esc(p.threshold??workspace.state.threshold)}"></div><div class="field"><label for="pilot-minimum">Minimum usable sessions</label><input id="pilot-minimum" name="minimumSessions" type="number" required min="3" max="30" step="1" value="${esc(p.minimumSessions??3)}"></div></div><dl class="facts"><div><dt>Evaluation unit</dt><dd>Participant-level holdout</dd></div><div><dt>Primary discrimination metric</dt><dd>AUPRC</dd></div><div><dt>Operational measures</dt><dd>Warning time, review burden, sensitivity, specificity, calibration assessment</dd></div><div><dt>Robustness</dt><dd>Subgroup performance, missingness, failure modes, temporal controls</dd></div></dl><div class="form-actions"><button class="button primary" type="submit">Generate protocol draft</button>${p.at?button('Export saved draft','export-pilot',{class:'small subtle'}):''}</div>${p.at?`<p class="technical-note">Discussion draft saved ${date(p.at)} · ${esc(p.version)}.</p>`:''}</form></section></div>
    <section class="partner-roles"><div><span>BAZI BRINGS</span><strong>Product workflow + frozen evaluation infrastructure</strong><p>Engagement-event schema, longitudinal review workflow, reference artifact, benchmark runner, evidence displays, and audit-oriented research tooling.</p></div><div><span>CLINICAL PARTNER BRINGS</span><strong>Use-case and workflow expertise</strong><p>Operational endpoint definition, care-team workflow context, data provenance, clinical interpretation, institutional requirements, and independent judgment about whether evidence is sufficient to continue.</p></div></section>
    <section class="study-gates"><h2>What a successful first meeting should produce</h2><p>A named clinical use case, a clinical or operational champion, a data-feasibility owner, and agreement on the next scoping step. No partnership, dataset access, validation result, or deployment is implied by this public demonstration.</p></section>`;
}
function governance() {
  const enabled=workspace.state.protocolEnabled;
  const readiness=[
    ['Synthetic data only','Active','No real patient records are permitted in this public workspace.'],
    ['Clinical validation','Not established','Reference-model performance has not been established in a clinical population.'],
    ['Clinical probability','Not available','The engagement signal is not a calibrated probability of a clinical outcome.'],
    ['Provider authority','Required','Engagement support requires a recorded provider decision.'],
    ['Diagnosis and treatment','Out of scope','Bazi does not diagnose, prescribe, recommend treatment changes, or modify a care plan.'],
    ['Acute-risk response','Out of scope','This workspace is not a crisis, emergency, suicide-risk, or clinical deterioration detection system.'],
    ['Patient outreach','Not connected','The public workspace cannot send messages, reminders, or other patient-facing outreach.'],
    ['Identity and access','Demo only','The provider identity is synthetic; production authentication and authorization are not enabled.'],
    ['EHR interoperability','Illustrative','FHIR exports demonstrate mapping concepts only; no live EHR connection is deployed.'],
    ['Audit and retention','Local demo','Records are browser-held; the local hash chain is inspectable but is not a clinical audit system.']
  ];
  return heading('RESEARCH ALPHA · SYNTHETIC WORKSPACE','Clinical and deployment boundaries','This workspace demonstrates an engagement-review workflow using generated records. It is designed to make system limits visible at the point of use, not hide them in disclaimer text.')+
    `<section class="boundary-hero"><div><span>INTENDED USE IN THIS DEMO</span><h2>Support review of participation change.</h2><p>Bazi organizes longitudinal engagement observations, applies a frozen synthetic reference model, and presents evidence for a provider-controlled engagement-support decision.</p></div><div><span>NOT AN INTENDED USE</span><h2>No diagnosis. No treatment decision.</h2><p>Do not use this workspace for clinical diagnosis, symptom assessment, treatment selection, medication decisions, acute-risk detection, emergency response, or autonomous patient outreach.</p></div></section>
    <section class="boundary-callout"><strong>Research status</strong><p>The reference model has synthetic provenance and has not been clinically validated. Its output is an engagement signal, not a calibrated clinical probability. Generated follow-up trajectories are demonstrations of workflow behavior and cannot establish safety, effectiveness, treatment response, or causal benefit.</p></section>
    <section class="readiness-section"><div class="section-heading"><div><h2>Deployment readiness</h2><p>What is demonstrated here, and what would still be required before any real-world use.</p></div></div><div class="readiness-table">${readiness.map(([control,status,meaning])=>`<div class="readiness-row"><strong>${control}</strong><span>${badge(status,status==='Active'||status==='Required'?'green':status==='Not established'||status==='Out of scope'?'amber':'gray')}</span><p>${meaning}</p></div>`).join('')}</div></section>
    <section class="engine-control"><div><h2>${enabled?'Engagement recommendation workflow enabled':'Engagement recommendation workflow paused'}</h2><p>${enabled?'The synthetic policy may surface permitted engagement-support options. A provider decision is required before an action is recorded as approved.':'Signal computation remains available; new engagement recommendations and approvals are blocked.'}</p></div>${button(enabled?'Pause recommendation workflow':'Resume recommendation workflow','toggle-protocol',{class:enabled?'':'primary'})}</section>
    <div class="governance-grid"><section><h2>Research configuration</h2><dl class="facts">${[['Reference model',MODEL.version],['Environment','Public synthetic research alpha'],['Action set',ACTION_SET_VERSION],['Clinical uncertainty','Not quantified'],['Raw synthetic event persistence',workspace.storage?'Active in this browser’s local storage':'Session memory; persistence unavailable'],['Integrity record','Local SHA-256 chain'],['Provider identity','Synthetic role; authentication not enabled']].map(([key,v])=>`<div><dt>${key}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><details class="action-details"><summary>Artifact fingerprint</summary><p class="hash">${modelHash}</p><p class="technical-note">SHA-256 of model metadata and coefficients. This is a reproducibility fingerprint, not a digital signature or clinical certification.</p></details></section>
    <section><h2>Permitted engagement support</h2><div class="action-library">${ACTIONS.map(a=>`<div><strong>${esc(a.label)}</strong><p>${esc(a.purpose)}</p><small>${esc(a.id)}</small></div>`).join('')}</div><p class="technical-note">The policy may also select no action when evidence is insufficient, the workflow is paused, or an observation window is active.</p></section></div>
    <section class="deployment-gates"><h2>Before real-world deployment</h2><p>A partner deployment would require a prospectively specified intended use and evaluation plan, independent clinical and safety review, representative-data validation, subgroup and failure-mode analysis, human-factors testing, privacy and security controls, authenticated role-based access, data governance and retention policies, integration verification, monitoring and incident-response procedures, and the agreements and institutional or regulatory review applicable to the deployment context.</p><p>No public-demo artifact should be interpreted as satisfying those requirements.</p></section>
    <section class="storage-section"><h2>Browser-held demonstration records</h2><p>Synthetic events, structured provider feedback, and study drafts are retained locally. The hash chain is not externally anchored and does not make browser storage immutable.</p><div class="action-row">${button('Export workspace state','export-state',{class:'small'})}<a class="button small" href="#audit">Inspect audit timeline</a>${button('Reset synthetic workspace','reset',{class:'small subtle'})}</div></section>`;
}
const auditLabels={
  workspace_initialized:'Workspace initialized',reference_cases_prepared:'Synthetic reference cases prepared',
  event_ingested:'Observation ingested',synthetic_events_imported:'Batch observations ingested',
  model_scored:'Model evaluation completed',action_policy_evaluated:'Action policy evaluated',
  decision_approve:'Provider approved engagement support',decision_modify:'Provider modified the action',
  decision_dismiss:'Provider dismissed the recommendation',decision_snooze:'Provider deferred review',
  followup_observed:'Seven-day follow-up recorded',protocol_status_changed:'Recommendation engine state changed',
  timeline_replay_started:'Patient timeline replayed',demo_threshold_changed:'Exploratory threshold changed',
  synthetic_patient_created:'Synthetic patient created',
  pilot_protocol_drafted:'Study protocol drafted',snoozed_review_reopened:'Deferred review reopened'
};
function auditEvidenceTime(record) {
  const detail=record.detail ?? {};
  if(detail.occurredAt) return detail.occurredAt;
  if(detail.windowEnd) return detail.windowEnd;
  const decision=detail.decisionId ? workspace.state.decisions.find(item=>item.id===detail.decisionId) : null;
  return decision?.observationStart ?? record.at;
}
function auditSummary(record) {
  const d=record.detail ?? {};
  const reference=d.decisionId ?? d.modelVersion ?? d.policyVersion ?? 'Synthetic workspace';
  const score=d.score!==undefined ? ` · score ${decimal(d.score,3)}` : '';
  const reason=d.reason ? ` · ${esc(d.reason)}` : '';
  const patient=d.patientId ? `<a href="${patientLink(d.patientId)}">${d.patientId}</a> · ` : '';
  return `${patient}${esc(reference)}${score}${reason}`;
}
function audit() {
  const records=workspace.state.audit.slice().reverse();
  const patients=new Set(workspace.state.audit.map(record=>record.detail?.patientId).filter(Boolean));
  const latest=records[0];
  return heading('RECORDED WORKFLOW','Audit timeline','Observations, model snapshots, policy gates, and provider decisions remain connected.',button('Export audit record','export-audit',{class:'small'}))+
    `<section class="audit-summary" aria-label="Audit record summary"><div><span>Ledger records</span><strong>${workspace.state.audit.length}</strong><small>Locally chained</small></div><div><span>People represented</span><strong>${patients.size}</strong><small>Synthetic only</small></div><div><span>Latest evidence</span><strong>${latest?date(auditEvidenceTime(latest)):'—'}</strong><small>${latest?time(auditEvidenceTime(latest))+' UTC':'No records yet'}</small></div></section><p class="technical-note">Each entry distinguishes the <strong>synthetic program evidence time</strong> from the <strong>browser recording time</strong>. This local SHA-256 chain is inspectable and exportable, but it is not externally anchored or an audit system for clinical use.</p><ol class="audit-timeline">${records.map(record=>{
      const evidenceAt=auditEvidenceTime(record);
      return `<li><div class="audit-time"><span class="audit-time-label">Evidence time</span><strong>${time(evidenceAt)}</strong><span>${date(evidenceAt)} · UTC</span><small>Recorded ${time(record.at)} · #${record.sequence}</small></div><div class="audit-entry"><span class="audit-kind">${esc(record.type.replaceAll('_',' '))}</span><h3>${esc(auditLabels[record.type]??record.type.replaceAll('_',' '))}</h3><p>${auditSummary(record)}</p><details><summary>Evidence, provenance, and integrity</summary><pre class="code-block">${esc(JSON.stringify({recordedAt:record.at,evidenceAt,actor:record.actor,detail:record.detail},null,2))}</pre><span class="hash">${record.hash}</span><small class="muted">Previous hash: ${record.previousHash}</small></details></div></li>`;
    }).join('')}</ol>`;
}
function integrations() {
  return heading('DATA CONTRACTS','Integrations','Ingest synthetic engagement locally and inspect the interfaces needed for a governed deployment.')+
    `<div class="integration-grid"><section><h2>Local event ingestion</h2><p>Known synthetic participant IDs · validated batches of up to 1,000 events</p><div class="action-row">${button('Import synthetic CSV','import-csv',{class:'primary'})}${button('Download CSV template','csv-template')}${button('Add observation','add-event',{patient:'BZ-001',class:'subtle'})}</div><pre class="code-block">{
  "patient_id": "BZ-001",
  "occurred_at": "2026-09-01T14:00:00Z",
  "status": "completed",
  "duration_minutes": 26,
  "engagement": 86,
  "fatigue": "low",
  "difficulty": "appropriate",
  "quality": 1
}</pre><p class="technical-note">Imports stay in this browser. Use synthetic data only. The template uses a timestamp after Aadi’s current observed history.</p></section><section><h2>Available interfaces</h2><dl class="facts"><div><dt>Engagement SDK</dt><dd>Repository source; partner testing required</dd></div><div><dt>Public event endpoint</dt><dd>Not deployed</dd></div><div><dt>FHIR / EHR connection</dt><dd>Illustrative mapping only</dd></div><div><dt>Authenticated provider backend</dt><dd>Repository scaffold; separate deployment</dd></div></dl><a class="row-action" href="https://github.com/aryaaupa/bazi/tree/main/sdk" target="_blank" rel="noopener noreferrer">Inspect SDK source ↗</a><div class="action-row">${button('Export event schema','export-schema',{class:'small'})}${button('Export mapping example','export-fhir',{class:'small'})}</div></section></div>
    <section class="subgroup-section"><h2>Illustrative FHIR mapping</h2><div class="table-wrap"><table><thead><tr><th>Bazi record</th><th>Potential resource</th><th>Mapping meaning</th></tr></thead><tbody>${[['Participant','Patient','Governed pseudonymous subject identifier'],['Engagement event','Observation','Measurement provenance and event timing'],['Reviewed engagement support','Task','Provider-controlled workflow'],['Participant check-in','QuestionnaireResponse','Partner-approved questions and response handling'],['Program context','CarePlan','Reference an existing plan; no treatment modification']].map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="technical-note">Mapping examples require terminology, profile, security, and interoperability review before any real integration.</p></section>`;
}
function comparisonView() {
  const patients=compareIds.slice(0,4).map(id=>workspace.patient(id)), r=report();
  if(patients.length<2) return heading('PATIENT COMPARISON','Compare patients','Select at least two patients from the patient list.')+'<a class="button" href="#queue">Choose patients</a>';
  const rows=[
    ['Current engagement signal',p=>p.assessment.available?decimal(p.assessment.score,3):'—'],
    ['Review state',p=>({elevated:'Review criteria met',watch:'Monitor closely',stable:'Routine monitoring',unavailable:'Insufficient evidence'})[p.assessment.band]],
    ['Evidence coverage',p=>percent(p.assessment.features.coverage)],
    ['Usable recent observations',p=>p.assessment.features.observedCount+' / '+p.assessment.features.windowCount],
    ['Missed-session rate',p=>percent(p.assessment.features.missedRate)],
    ['Duration vs baseline',p=>percent(p.assessment.features.durationRatio)],
    ['High-fatigue rate',p=>percent(p.assessment.features.fatigueHighRate)],
    ['Too-hard rate',p=>percent(p.assessment.features.tooHardRate)],
    ['Engagement trend',p=>decimal(p.assessment.features.engagementSlope,2)+' pts/event'],
    ['Average engagement',p=>decimal(p.assessment.features.engagementMean,1)],
    ['Engagement variation',p=>decimal(p.assessment.features.volatility,1)],
    ['Late-session rate',p=>percent(p.assessment.features.lateRate)]
  ];
  return heading('PATIENT COMPARISON','Compare observed participation','Side-by-side comparison uses the same deterministic scoring pipeline for every selected synthetic patient. It is not a clinical ranking.',`<a class="button" href="#queue">Change selection</a>`)+
  `<section class="compare-summary">${patients.map(p=>`<article><span>${esc(p.id)}</span><h2><a href="${patientLink(p.id)}">${esc(p.name)}</a></h2><strong>${p.assessment.available?decimal(p.assessment.score,3):'—'}</strong><small>current engagement signal</small>${bandBadge(p.assessment)}</article>`).join('')}</section>
  <section class="comparison-table"><div class="section-heading"><div><h2>Same inputs, side by side</h2><p>Direct event observations are transformed into the derived features below.</p></div></div><div class="table-wrap"><table><thead><tr><th>Measure</th>${patients.map(p=>`<th>${esc(p.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,get])=>`<tr><td><strong>${label}</strong></td>${patients.map(p=>`<td>${get(p)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>
  <section class="benchmark-context"><div><span>SYNTHETIC REFERENCE BENCHMARK</span><h2>Current threshold context</h2><p>At base threshold <strong>${decimal(workspace.state.threshold)}</strong>, the generated benchmark has sensitivity <strong>${percent(r.sensitivity)}</strong>, specificity <strong>${percent(r.specificity)}</strong>, and <strong>${decimal(r.flagsPerParticipantWeek,3)}</strong> review flags per patient-week.</p></div><a class="button" href="#analytics">Open benchmark explorer</a></section>`;
}
function render() {
  const hash=location.hash.slice(1)||'overview',[path]=hash.split('?'),allRoutes=[...ROUTES,...SECONDARY_ROUTES];
  route=path.startsWith('patient/')?'patient':path==='compare'?'compare':allRoutes.some(([id])=>id===path)?path:'overview';
  if(route==='patient')patientId=decodeURIComponent(path.slice(8));
  const title=route==='patient'?'Patient record':route==='compare'?'Patient comparison':allRoutes.find(([id])=>id===route)?.[1]??'Overview';
  document.title=`${title} | Bazi engagement intelligence`;
  $('#breadcrumb').innerHTML=`Engagement intelligence <span aria-hidden="true">/</span> <strong>${title}</strong>`;
  $('#protocol-badge').textContent=workspace.state.protocolEnabled?'Provider controlled':'Engine paused';
  $('#protocol-badge').className=`protocol-status ${workspace.state.protocolEnabled?'':'paused'}`;
  const nav=routes=>routes.map(([id,label])=>`<a class="nav-link ${route===id||route==='patient'&&id==='queue'?'active':''}" href="#${id}" ${route===id||route==='patient'&&id==='queue'?'aria-current="page"':''}>${icon(id)}<span>${label}</span></a>`).join('');
  $('#navigation').innerHTML=nav(ROUTES);$('#secondary-navigation').innerHTML=nav(SECONDARY_ROUTES);
  const views={overview,queue,patient:patientDetail,compare:comparisonView,interventions,outcomes,analytics,pilot,governance,audit,integrations};
  try {$('#main').innerHTML=views[route]();}
  catch(error){$('#main').innerHTML=empty('This record could not be opened',esc(error.message),'<a class="button" href="#overview">Back to overview</a>');}
  if(workspace.storageWarning)$('#main').insertAdjacentHTML('afterbegin',`<p class="validation-note">${esc(workspace.storageWarning)}</p>`);
}

function toast(message,error=false) { clearTimeout(toastTimer); $('#toast').textContent=message; $('#toast').className=`visible${error?' error':''}`; toastTimer=setTimeout(()=>$('#toast').className='',5500); }
function download(name,content,type='application/json') { const blob=new Blob([typeof content==='string'?content:JSON.stringify(content,null,2)],{type}); const href=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000); }
function csv(rows,headers) { return [headers.join(','),...rows.map(row=>headers.map(key=>`"${String(row[key]??'').replaceAll('"','""')}"`).join(','))].join('\r\n'); }
function openModal(title,body,handler=null) {
  modalHandler=handler;
  $('#modal-content').innerHTML=`<div class="modal-header"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Close dialog">×</button></div><div class="modal-body">${body}<div class="error-message" id="modal-error" role="alert"></div></div>`;
  $('#modal').showModal();
}
const formButtons=label=>`<div class="modal-actions"><button type="button" class="button" data-action="close-modal">Cancel</button><button type="submit" class="button primary">${label}</button></div>`;
const selectAction=selected=>`<div class="field"><label for="action-choice">Permitted engagement action</label><select id="action-choice" name="actionId">${ACTIONS.map(action=>`<option value="${action.id}" ${selected===action.id?'selected':''}>${action.label}</option>`).join('')}</select></div>`;
const noteField=`<div class="field" style="margin-top:15px"><label for="provider-note">Provider note</label><textarea id="provider-note" name="note" maxlength="1000" placeholder="Record the reason for your decision…"></textarea></div>`;
function eventForm(id) {
  const patient=workspace.patient(id),last=workspace.events(id).at(-1),next=new Date((last?Date.parse(last.occurred_at):START)+2*DAY).toISOString().slice(0,16);
  openModal('Add a synthetic session',`<p>Append a generated observation to ${esc(patient.name)} (${id}). This event stays in your browser and immediately recomputes the signal.</p><form id="modal-form"><div class="form-grid"><div class="field full"><label for="event-time">Event time (UTC)</label><input id="event-time" name="occurred_at" type="datetime-local" value="${next}" required></div><div class="field"><label for="event-status">Session status</label><select id="event-status" name="status"><option>completed</option><option>shortened</option><option>late</option><option>skipped</option></select></div><div class="field"><label for="event-duration">Duration (minutes)</label><input id="event-duration" name="duration_minutes" type="number" min="0" max="180" step="0.1" value="${patient.baseline_duration}" required></div><div class="field"><label for="event-engagement">Engagement (0–100)</label><input id="event-engagement" name="engagement" type="number" min="0" max="100" value="${patient.baseline_engagement}" required></div><div class="field"><label for="event-quality">Observation quality (0–1)</label><input id="event-quality" name="quality" type="number" min="0" max="1" step="0.1" value="1" required></div><div class="field"><label for="event-fatigue">Reported fatigue</label><select id="event-fatigue" name="fatigue"><option>low</option><option>medium</option><option>high</option></select></div><div class="field"><label for="event-difficulty">Reported difficulty</label><select id="event-difficulty" name="difficulty"><option>appropriate</option><option>too-easy</option><option>too-hard</option></select></div></div>${formButtons('Ingest event')}</form>`,async form=>{
    const values=Object.fromEntries(new FormData(form));
    values.patient_id=id;values.occurred_at=new Date(values.occurred_at+'Z').toISOString();
    for(const key of ['duration_minutes','engagement','quality']) values[key]=Number(values[key]);
    await workspace.ingestBatch([values]);toast('Synthetic event ingested. Signal and policy recomputed.');
  });
}
async function perform(action,element) {
  const id=element.dataset.id,patient=element.dataset.patient;
  if(action==='open-patient'){location.hash=patientLink(patient);return;}
  if(action==='close-modal'){$('#modal').close();return;}
  if(action==='start-demo'){await workspace.startDemo();location.hash='#patient/BZ-001';toast('Aadi’s timeline replayed from the observed baseline.');}
  else if(action==='toggle-future'){showFuture=!showFuture;}
  else if(action==='advance-week'){const value=await workspace.advanceDays(patient,7);toast(`${value.ingested} observations ingested. Signal and policy recomputed.`);}
  else if(action==='advance'){const decision=await workspace.advance(patient);toast(`Event ingested · reference signal ${decimal(decision.score,3)} · ${stateLabel(decision.status)}`);}
  else if(action==='evaluate'){const decision=await workspace.evaluate(patient);toast(`Decision recorded · ${stateLabel(decision.status)}`);}
  else if(action==='approve'){await workspace.review(id,'approve');toast('Provider approval recorded. Action is sandbox-only.');}
  else if(action==='snooze'){await workspace.review(id,'snooze');toast('Recommendation snoozed for 48 hours.');}
  else if(action==='modify'){
    const decision=workspace.decision(id);
    openModal('Modify the proposed action',`<p>Select another permitted engagement action. Modifying leaves the decision pending until you approve it.</p><form id="modal-form">${selectAction(decision.actionId)}${noteField}${formButtons('Save modification')}</form>`,async form=>{const value=Object.fromEntries(new FormData(form));await workspace.review(id,'modify',value);toast('Modification saved. Provider approval still required.');});
  }
  else if(action==='dismiss') openModal('Dismiss with a reason',`<p>Capture why this engagement recommendation should not proceed.</p><form id="modal-form"><div class="field"><label for="dismiss-reason">Reason</label><select id="dismiss-reason" name="reason">${DISMISS_REASONS.map(reason=>`<option>${reason}</option>`).join('')}</select></div>${noteField}${formButtons('Record dismissal')}</form>`,async form=>{await workspace.review(id,'dismiss',Object.fromEntries(new FormData(form)));toast('Dismissal and reason recorded.');});
  else if(action==='followup'||action==='followup-no-change'){await workspace.followUp(id,action==='followup'?'recovery':'no_change');toast('Seven-day synthetic follow-up recorded.');}
  else if(action==='ai-synthesis'){
    const target=$('#ai-synthesis-result'),control=element;
    const p=workspace.patient(patient??patientId),x=explanation(p),r=x.result;
    const evidence={
      schemaVersion:'bazi-evidence-summary-v1',
      dataClass:'synthetic-only',
      patient:{id:p.id,displayName:p.name},
      observedThrough:x.last?.occurred_at??null,
      engagementSignal:r.available?Number(r.score.toFixed(3)):null,
      reviewBand:r.band,
      evidence:{usableRecent:r.features.observedCount,windowCount:r.features.windowCount,coverage:Number(r.features.coverage.toFixed(3)),effectiveThreshold:Number(r.effectiveThreshold.toFixed(3))},
      observedChange:{durationPercent:x.durationChange===null?null:Math.round(x.durationChange*100),missedRecent:x.missed,lateRecent:x.late,engagementPoints:Math.round(x.engagementChange)},
      chronology:x.chronology.map(item=>({day:Math.round(item.day+1),label:item.label,detail:item.detail})).slice(-6),
      contributors:r.contributions.filter(item=>item.delta>.01).slice(0,5).map(item=>({label:item.label,logOddsDelta:Number(item.delta.toFixed(3))}))
    };
    control.disabled=true;control.textContent='Synthesizing…';
    target.classList.add('loading');target.innerHTML='<span>Generating from visible synthetic evidence</span><p>No score or policy state is being changed.</p>';
    try{
      const response=await fetch('/api/evidence-summary',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(evidence)});
      if(!response.ok) throw new Error('AI synthesis service unavailable');
      const value=await response.json();
      if(!value?.summary) throw new Error('AI synthesis returned no summary');
      target.innerHTML=`<span>AI-GENERATED · ${esc(value.model??'Workers AI')}</span><p>${esc(value.summary)}</p><small>Generated from synthetic engagement evidence only. Verify against the record above. Not a diagnosis, clinical assessment, treatment recommendation, or acute-risk evaluation.</small>`;
    }catch(error){
      target.innerHTML=`<span>AI SYNTHESIS UNAVAILABLE</span><p>${esc(x.narrative)}</p><small>Deterministic fallback shown. The Bazi signal and provider workflow continue without the AI service.</small>`;
    }finally{
      target.classList.remove('loading');control.disabled=false;control.textContent='Generate summary';
    }
    return;
  }
  else if(action==='counterfactual'){
    const result=workspace.assessment(patientId),contributor=result.contributions.find(item=>item.index===Number(id));
    if(!contributor) throw new Error('That sensitivity scenario is unavailable for the current record.');
    const target=$('#counterfactual-result');
    document.querySelectorAll('.contributor').forEach(row=>row.classList.toggle('active',row.dataset.contributorIndex===String(id)));
    document.querySelectorAll('.counterfactual-trigger').forEach(control=>{
      const active=control.dataset.id===String(id);
      control.classList.toggle('active',active);
      control.textContent=active?'Selected':'Explore scenario';
      control.setAttribute('aria-pressed',String(active));
    });
    target.innerHTML=`<div class="counterfactual"><span class="counterfactual-label">SENSITIVITY SCENARIO · ${esc(contributor.label)}</span><strong>${decimal(result.score,3)} → ${decimal(contributor.counterfactualScore,3)}</strong><p>If this input returned to the personal baseline while the other model inputs stayed fixed, the reference signal would change by <b>${signed(contributor.counterfactualScore-result.score,3)}</b>.</p><p class="technical-note">This is a model sensitivity analysis. It does not estimate what would happen to the person if this factor changed and should not be interpreted as a treatment effect.</p></div>`;
    target.scrollIntoView({behavior:'smooth',block:'nearest'});
    target.focus({preventScroll:true});
    return;
  }
  else if(action==='compare-open'){if(compareIds.length<2)throw new Error('Select at least two patients.');location.hash='#compare';return;}
  else if(action==='compare-clear'){compareIds=[];}
  else if(action==='add-note') openModal('Add a patient note',`<p>Record synthetic care-team context for ${esc(workspace.patient(patient).name)}. Notes are stored in this browser and never affect the engagement signal.</p><form id="modal-form"><div class="field"><label for="patient-note">Note</label><textarea id="patient-note" name="note" maxlength="2000" rows="6" required placeholder="Observed context, follow-up question, or review note…"></textarea></div>${formButtons('Save note')}</form>`,async form=>{await workspace.addNote(patient,new FormData(form).get('note'));toast('Patient note saved and audit logged.');});
  else if(action==='delete-note'){await workspace.deleteNote(patient,id);toast('Patient note deleted and audit logged.');}
  else if(action==='create-patient') openModal('Create a synthetic patient',`<p>Add a simulated participant with a deterministic 12-week trajectory. Start with zero observed events, then advance the simulation.</p><form id="modal-form"><div class="form-grid"><div class="field full"><label for="new-name">Synthetic display name</label><input id="new-name" name="name" required maxlength="80" placeholder="For example, Casey Morgan"></div><div class="field full"><label for="new-scenario">Trajectory</label><select id="new-scenario" name="scenario">${['gradual','stable','sudden','intermittent','low_data'].map(id=>`<option value="${id}">${SCENARIO_LABELS[id]}</option>`).join('')}</select></div></div>${formButtons('Create patient')}</form>`,async form=>{const patient=await workspace.createPatient(Object.fromEntries(new FormData(form)));location.hash=patientLink(patient.id);toast('Synthetic patient created. Advance three observations to begin scoring.');});
  else if(action==='add-event') eventForm(patient??patientId);
  else if(action==='toggle-protocol'){await workspace.setProtocol(!workspace.state.protocolEnabled);toast(workspace.state.protocolEnabled?'Protocol enabled. Provider review remains required.':'Recommendations and approvals disabled.');}
  else if(action==='reset') openModal('Reset the synthetic workspace',`<p>This clears your browser’s demo decisions, imported observations, and generated pilot draft. The same 500-patient cohort will be regenerated from seed ${SEED}.</p><form id="modal-form">${formButtons('Reset workspace')}</form>`,async()=>{await workspace.reset();await workspace.prepareReferenceCases();bootstrap=null;reportCache=null;location.hash='#overview';toast('Fresh synthetic workspace restored.');});
  else if(action==='page-prev') queuePage=Math.max(0,queuePage-1);
  else if(action==='page-next') queuePage++;
  else if(action==='intervention-filter') interventionFilter=id;
  else if(action==='export-state') download('bazi-synthetic-workspace.json',{dataClass:'synthetic-only',state:workspace.state});
  else if(action==='export-audit') download('bazi-audit-trail.json',{synthetic:true, externallyAnchored:false,records:workspace.state.audit});
  else if(action==='export-decisions') download('bazi-provider-decisions.json',{synthetic:true,decisions:workspace.state.decisions});
  else if(action==='export-events') download(`${patient}-observed-events.csv`,csv(workspace.events(patient),['patient_id','occurred_at','status','duration_minutes','engagement','fatigue','difficulty','quality']), 'text/csv');
  else if(action==='export-cohort') download('bazi-synthetic-cohort.csv',csv(workspace.list().map(patient=>({patient_id:patient.id,name:patient.name,scenario:patient.scenario,observed_events:workspace.events(patient.id).length,risk_score:patient.assessment.available?patient.assessment.score:'',signal:patient.assessment.band})),['patient_id','name','scenario','observed_events','risk_score','signal']),'text/csv');
  else if(action==='export-validation') download('bazi-synthetic-validation.json',{synthetic:true,clinicalPerformance:false,seed:SEED,model:MODEL,method:'one participant landmark at day 53; future seven-day events determine labels',report:report(),bootstrap,rows:evaluationRows});
  else if(action==='export-pilot') download('bazi-pilot-draft.json',workspace.state.pilot);
  else if(action==='bootstrap'){bootstrap=participantBootstrap(evaluationRows,{iterations:100,threshold:workspace.state.threshold,seed:81273});toast('100 deterministic participant bootstrap resamples computed.');}
  else if(action==='csv-template') {
    const patient=workspace.patient('BZ-001'),last=workspace.events(patient.id).at(-1);
    download('bazi-synthetic-events-template.csv',csv([{patient_id:patient.id,occurred_at:new Date(Date.parse(last.occurred_at)+2*DAY).toISOString(),status:'completed',duration_minutes:patient.baseline_duration,engagement:patient.baseline_engagement,fatigue:'low',difficulty:'appropriate',quality:1}],['patient_id','occurred_at','status','duration_minutes','engagement','fatigue','difficulty','quality']),'text/csv');
  }
  else if(action==='import-csv') openModal('Import synthetic session events',`<p>Use the downloadable template. All rows are validated before any are written. New events must follow each patient’s observed history; real patient data must not be used.</p><form id="modal-form"><div class="field"><label for="event-csv">Synthetic CSV (under 1 MB)</label><input id="event-csv" name="csv" type="file" accept=".csv,text/csv" required></div><label class="checkbox-field"><input type="checkbox" required><span>I confirm that these records are synthetic and contain no real patient information.</span></label>${formButtons('Validate & ingest')}</form>`,async form=>{const file=form.querySelector('input[type=file]').files[0];if(file.size>1000000)throw new Error('CSV must be smaller than 1 MB.');const events=parseEventCsv(await file.text());const count=await workspace.ingestBatch(events);toast(`${count} validated synthetic events ingested.`);});
  else if(action==='export-schema') download('bazi-event-schema.json',{type:'object',additionalProperties:false,required:['patient_id','occurred_at','status','duration_minutes','engagement','fatigue','difficulty','quality'],properties:{patient_id:{type:'string',pattern:'^BZ-[0-9]+$'},occurred_at:{type:'string',format:'date-time'},status:{enum:['completed','shortened','late','skipped']},duration_minutes:{type:'number',minimum:0,maximum:180},engagement:{type:'number',minimum:0,maximum:100},fatigue:{enum:['low','medium','high']},difficulty:{enum:['appropriate','too-easy','too-hard']},quality:{type:'number',minimum:0,maximum:1}}});
  else if(action==='export-fhir') {
    const patient=workspace.patient('BZ-001'),last=workspace.events(patient.id).at(-1);
    download('bazi-synthetic-fhir-mapping.json',{resourceType:'Bundle',type:'collection',meta:{tag:[{system:'https://example.invalid/bazi-demo',code:'synthetic-illustrative-only'}]},entry:[{resource:{resourceType:'Patient',id:'demo-BZ-001',name:[{text:`${patient.name} (SYNTHETIC)`}]}},{resource:{resourceType:'Observation',id:'demo-engagement',status:'final',code:{text:'Synthetic engagement score — terminology mapping pending'},subject:{reference:'Patient/demo-BZ-001'},effectiveDateTime:last.occurred_at,valueQuantity:{value:last.engagement,unit:'illustrative points /100'}}}]});
  }
  render();
}

document.addEventListener('click',async event=>{
  const element=event.target.closest('[data-action]');if(!element)return;
  if(element.tagName==='TR'&&event.target.closest('a'))return;
  event.preventDefault();if(busy)return;busy=true;
  try{await perform(element.dataset.action,element);}catch(error){toast(error.message,true);}finally{busy=false;}
});
document.addEventListener('input',event=>{
  if(event.target.id==='patient-search') {
    queueSearch=event.target.value;queuePage=0;const position=event.target.selectionStart;render();const input=$('#patient-search');input.focus();input.setSelectionRange(position,position);
  }
  if(event.target.id==='threshold-slider') thresholdPreview(Number(event.target.value));
});
document.addEventListener('change',async event=>{
  if(event.target.id==='band-filter'){queueBand=event.target.value;queuePage=0;render();}
  else if(event.target.id==='sort-patients'){queueSort=event.target.value;render();}
  else if(event.target.id==='event-status'&&event.target.value==='skipped') $('#event-duration').value=0;
  else if(event.target.id==='threshold-slider'){if(busy)return;busy=true;try{await workspace.setThreshold(Number(event.target.value));bootstrap=null;reportCache=null;render();}catch(error){toast(error.message,true);}finally{busy=false;}}
});
document.addEventListener('submit',async event=>{
  if(!['modal-form','pilot-form'].includes(event.target.id))return;
  event.preventDefault();if(busy)return;busy=true;
  const submit=event.target.querySelector('button[type=submit]');submit.disabled=true;
  try{
    if(event.target.id==='modal-form'){await modalHandler?.(event.target);$('#modal').close();render();}
    else {
      const config=Object.fromEntries(new FormData(event.target));
      for(const key of ['horizon','observation','threshold','minimumSessions'])config[key]=Number(config[key]);
      if(!config.program.trim()||!Number.isFinite(config.threshold)||config.threshold<.2||config.threshold>.95||!Number.isInteger(config.minimumSessions)||config.minimumSessions<3||config.minimumSessions>30||![3,7,14].includes(config.horizon)||![7,14,28].includes(config.observation))throw new Error('Check the protocol settings.');
      config.version='pilot-draft-v1';await workspace.savePilot(config);download('bazi-pilot-protocol-draft.md',draftProtocol(config),'text/markdown');render();toast('Draft protocol generated and saved. Institutional review is still required.');
    }
  }catch(error){if(event.target.id==='modal-form'){$('#modal-error').textContent=error.message;$('#modal-error').classList.add('visible');}else toast(error.message,true);}
  finally{busy=false;submit.disabled=false;}
});
$('#menu-toggle').addEventListener('click',()=>{const open=$('.sidebar').classList.toggle('open');$('#menu-toggle').setAttribute('aria-expanded',String(open));});
window.addEventListener('hashchange',()=>{$('.sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');render();window.scrollTo(0,0);});
async function boot() {
  await workspace.initialize();await workspace.prepareReferenceCases();modelHash=await fingerprint(MODEL);
  if(location.hash.includes('guided=1')){await workspace.startDemo();location.hash='#patient/BZ-001';}
  render();
  if('serviceWorker'in navigator)navigator.serviceWorker.register(new URL('../sw.js',import.meta.url)).catch(()=>{});
}
export const ready=boot().catch(error=>{$('#main').innerHTML=empty('Workspace could not initialize',esc(error.message),'<a class="button" href="../">Back to Bazi</a>');});
