(() => {
'use strict';

const MODEL_VERSION='bazi-risk-lr-synth-v0.2';
const LOCAL_KEY='bazi-saas-alpha-v2';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);
const sigmoid=x=>1/(1+Math.exp(-x));
const now=()=>new Date().toISOString();
const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;

const DEFAULT_POLICIES=[
 {id:'P-LOW',min_risk:0,max_risk:39,recommendation:'Continue current plan and monitor.',requires_approval:false},
 {id:'P-MOD',min_risk:40,max_risk:69,recommendation:'Reduce non-clinical friction: adjust reminder timing and request a brief engagement check-in.',requires_approval:true},
 {id:'P-HIGH',min_risk:70,max_risk:100,recommendation:'Escalate for provider review before any treatment-plan change.',requires_approval:true}
];

function demoPatients(){return [
 {id:'pt-maya',external_id:'BZ-001',display_name:'Maya Chen',pathway:'Digital rehabilitation',baseline_duration:26,baseline_engagement:87,status:'monitoring'},
 {id:'pt-jordan',external_id:'BZ-002',display_name:'Jordan Lee',pathway:'CBT program',baseline_duration:18,baseline_engagement:82,status:'monitoring'},
 {id:'pt-sam',external_id:'BZ-003',display_name:'Sam Rivera',pathway:'Cardiac rehabilitation',baseline_duration:30,baseline_engagement:90,status:'monitoring'}
]}
function demoEvents(){return {
 'pt-maya':[
  {id:uid('e'),occurred_at:'2026-08-01T14:00:00Z',status:'completed',duration_minutes:27,fatigue:'low',difficulty:'appropriate',engagement:88},
  {id:uid('e'),occurred_at:'2026-08-03T14:00:00Z',status:'completed',duration_minutes:26,fatigue:'low',difficulty:'appropriate',engagement:86},
  {id:uid('e'),occurred_at:'2026-08-05T14:00:00Z',status:'late',duration_minutes:23,fatigue:'medium',difficulty:'appropriate',engagement:79},
  {id:uid('e'),occurred_at:'2026-08-08T14:00:00Z',status:'shortened',duration_minutes:15,fatigue:'high',difficulty:'too-hard',engagement:66},
  {id:uid('e'),occurred_at:'2026-08-11T14:00:00Z',status:'skipped',duration_minutes:0,fatigue:'high',difficulty:'too-hard',engagement:49}
 ],
 'pt-jordan':[
  {id:uid('e'),occurred_at:'2026-08-02T15:00:00Z',status:'completed',duration_minutes:19,fatigue:'low',difficulty:'appropriate',engagement:84},
  {id:uid('e'),occurred_at:'2026-08-05T15:00:00Z',status:'completed',duration_minutes:18,fatigue:'medium',difficulty:'appropriate',engagement:81},
  {id:uid('e'),occurred_at:'2026-08-08T15:00:00Z',status:'late',duration_minutes:16,fatigue:'medium',difficulty:'appropriate',engagement:76}
 ],
 'pt-sam':[
  {id:uid('e'),occurred_at:'2026-08-01T17:00:00Z',status:'completed',duration_minutes:31,fatigue:'low',difficulty:'appropriate',engagement:91},
  {id:uid('e'),occurred_at:'2026-08-04T17:00:00Z',status:'completed',duration_minutes:30,fatigue:'low',difficulty:'appropriate',engagement:92},
  {id:uid('e'),occurred_at:'2026-08-07T17:00:00Z',status:'completed',duration_minutes:29,fatigue:'low',difficulty:'appropriate',engagement:90}
 ]
}}
function defaultLocal(){return {user:{id:'local-provider',email:'founder@bazi.local',role:'provider'},organization:{id:'local-org',name:'Bazi Design Partner Sandbox'},patients:demoPatients(),events:demoEvents(),policies:DEFAULT_POLICIES,decisions:[],activePatientId:'pt-maya'}}

const Store={
 mode:'local', client:null, state:null,
 async init(){
  const cfg=window.BAZI_CONFIG||{};
  if(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase){
   this.mode='supabase';
   this.client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   const {data:{session}}=await this.client.auth.getSession();
   if(session){await this.loadRemote(cfg.organizationId)}
   return !!session;
  }
  this.mode='local';
  try{this.state=JSON.parse(localStorage.getItem(LOCAL_KEY))||defaultLocal()}catch{this.state=defaultLocal()}
  this.persist(); return true;
 },
 persist(){if(this.mode==='local')localStorage.setItem(LOCAL_KEY,JSON.stringify(this.state))},
 async signIn(email,password){
  if(this.mode!=='supabase')return {ok:true};
  const {data,error}=await this.client.auth.signInWithPassword({email,password});
  if(error)return {ok:false,error:error.message};
  await this.loadRemote((window.BAZI_CONFIG||{}).organizationId); return {ok:true,user:data.user};
 },
 async signOut(){if(this.mode==='supabase')await this.client.auth.signOut();else{this.state=defaultLocal();this.persist()}},
 async loadRemote(configOrgId){
  const {data:{user}}=await this.client.auth.getUser();
  if(!user)throw new Error('Not authenticated');
  let membershipQuery=this.client.from('organization_members').select('organization_id,role').eq('user_id',user.id).limit(1);
  if(configOrgId)membershipQuery=membershipQuery.eq('organization_id',configOrgId);
  const {data:memberships,error:memErr}=await membershipQuery;
  if(memErr)throw memErr; if(!memberships?.length)throw new Error('No Bazi organization membership found for this user.');
  const membership=memberships[0],orgId=membership.organization_id;
  const [{data:org},{data:patients,error:pErr},{data:policies,error:polErr},{data:decisions,error:dErr}]=await Promise.all([
   this.client.from('organizations').select('*').eq('id',orgId).single(),
   this.client.from('patients').select('*').eq('organization_id',orgId).order('created_at'),
   this.client.from('intervention_policies').select('*').eq('organization_id',orgId).eq('active',true).order('min_risk'),
   this.client.from('model_decisions').select('*').eq('organization_id',orgId).order('created_at',{ascending:false}).limit(100)
  ]);
  if(pErr)throw pErr;if(polErr)throw polErr;if(dErr)throw dErr;
  const events={};
  await Promise.all((patients||[]).map(async p=>{const {data,error}=await this.client.from('patient_events').select('*').eq('organization_id',orgId).eq('patient_id',p.id).order('occurred_at');if(error)throw error;events[p.id]=data||[]}));
  this.state={user:{id:user.id,email:user.email,role:membership.role},organization:org,patients:patients||[],events,policies:policies?.length?policies:DEFAULT_POLICIES,decisions:decisions||[],activePatientId:patients?.[0]?.id||null};
 },
 async addPatient(input){
  if(this.mode==='local'){const p={id:uid('pt'),external_id:`BZ-${String(this.state.patients.length+1).padStart(3,'0')}`,...input,status:'monitoring'};this.state.patients.push(p);this.state.events[p.id]=[];this.state.activePatientId=p.id;this.persist();return p}
  const orgId=this.state.organization.id;const {data,error}=await this.client.from('patients').insert({organization_id:orgId,external_id:`BZ-${Date.now().toString().slice(-6)}`,...input}).select().single();if(error)throw error;this.state.patients.push(data);this.state.events[data.id]=[];this.state.activePatientId=data.id;return data
 },
 async addEvent(patientId,event){
  if(this.mode==='local'){const e={id:uid('e'),occurred_at:now(),...event};(this.state.events[patientId]||=[]).push(e);this.persist();return e}
  const {data,error}=await this.client.from('patient_events').insert({organization_id:this.state.organization.id,patient_id:patientId,created_by:this.state.user.id,occurred_at:now(),event_type:'session',...event}).select().single();if(error)throw error;(this.state.events[patientId]||=[]).push(data);return data
 },
 async addDecision(record){
  if(this.mode==='local'){this.state.decisions.unshift(record);this.persist();return record}
  const {data,error}=await this.client.from('model_decisions').insert({organization_id:this.state.organization.id,patient_id:record.patient_id,model_version:record.model_version,risk:record.risk,confidence:record.confidence,features:record.features,top_signals:record.top_signals,recommendation:record.recommendation,requires_approval:record.requires_approval,status:record.status,source:record.source,created_by:this.state.user.id}).select().single();if(error)throw error;this.state.decisions.unshift(data);return data
 },
 async updateDecision(id,status){
  const patch={status}; if(status==='provider_approved'){patch.approved_at=now();patch.approved_by=this.state.user.id}if(status==='dismissed')patch.dismissed_at=now();
  if(this.mode==='local'){const d=this.state.decisions.find(x=>x.id===id);if(d)Object.assign(d,patch);this.persist();return d}
  const {data,error}=await this.client.from('model_decisions').update(patch).eq('id',id).select().single();if(error)throw error;const i=this.state.decisions.findIndex(x=>x.id===id);if(i>=0)this.state.decisions[i]=data;return data
 }
};

let model=null;
const FEATURES=['missedRate','durationRatio','fatigueHighRate','tooHardRate','engagementSlope','engagementMean','volatility','lateRate'];
function seededRandom(seed=90317){let s=seed>>>0;return()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296}}
function syntheticRows(n=1600){const r=seededRandom(),rows=[];for(let i=0;i<n;i++){const f={missedRate:r()*.75,durationRatio:.25+r()*.85,fatigueHighRate:r()*.85,tooHardRate:r()*.75,engagementSlope:-16+r()*22,engagementMean:35+r()*60,volatility:r()*24,lateRate:r()*.7};const latent=-1.65+3*f.missedRate-1.8*f.durationRatio+1.75*f.fatigueHighRate+1.5*f.tooHardRate-.095*f.engagementSlope-.025*(f.engagementMean-65)+.045*f.volatility+f.lateRate+(r()-.5)*1.3;rows.push({x:vector(f),y:r()<sigmoid(latent)?1:0})}return rows}
function train(rows,epochs=420,lr=.18){const w=new Array(FEATURES.length).fill(0);let b=0;for(let e=0;e<epochs;e++){const gw=w.map(()=>0);let gb=0;for(const row of rows){let z=b;w.forEach((v,i)=>z+=v*row.x[i]);const err=sigmoid(z)-row.y;gw.forEach((_,i)=>gw[i]+=err*row.x[i]);gb+=err}w.forEach((_,i)=>w[i]-=lr*gw[i]/rows.length);b-=lr*gb/rows.length}return{weights:w,bias:b,version:MODEL_VERSION,samples:rows.length}}
function slope(vals){if(vals.length<2)return 0;const mx=(vals.length-1)/2,my=vals.reduce((a,b)=>a+b,0)/vals.length;let n=0,d=0;vals.forEach((v,i)=>{n+=(i-mx)*(v-my);d+=(i-mx)**2});return d?n/d:0}
function std(vals){if(!vals.length)return 0;const m=vals.reduce((a,b)=>a+b,0)/vals.length;return Math.sqrt(vals.reduce((a,b)=>a+(b-m)**2,0)/vals.length)}
function patient(){return Store.state.patients.find(p=>p.id===Store.state.activePatientId)}
function events(){return Store.state.events[Store.state.activePatientId]||[]}
function computeFeatures(p=patient(),ev=events()){const recent=ev.slice(-6),n=Math.max(recent.length,1),completed=recent.filter(e=>e.status!=='skipped'),eng=recent.map(e=>Number(e.engagement)||0),avg=completed.length?completed.reduce((s,e)=>s+Number(e.duration_minutes||0),0)/completed.length:0;return{missedRate:recent.filter(e=>e.status==='skipped').length/n,durationRatio:clamp(avg/Number(p?.baseline_duration||25),0,1.5),fatigueHighRate:recent.filter(e=>e.fatigue==='high').length/n,tooHardRate:recent.filter(e=>e.difficulty==='too-hard').length/n,engagementSlope:slope(eng),engagementMean:eng.length?eng.reduce((a,b)=>a+b,0)/eng.length:Number(p?.baseline_engagement||80),volatility:std(eng),lateRate:recent.filter(e=>e.status==='late').length/n}}
function vector(f){return[f.missedRate,f.durationRatio,f.fatigueHighRate,f.tooHardRate,f.engagementSlope/20,f.engagementMean/100,f.volatility/25,f.lateRate]}
function risk(f){let z=model.bias;model.weights.forEach((w,i)=>z+=w*vector(f)[i]);return clamp(Math.round(sigmoid(z)*100),2,98)}
function confidence(f){const coverage=Math.min(events().length,6)/6,separation=Math.abs(risk(f)-50)/50;return clamp(Math.round((.45+.35*coverage+.2*separation)*100),45,96)}
function engagement(f){return clamp(Math.round(f.engagementMean+Math.min(f.engagementSlope*2,8)-f.missedRate*18-f.fatigueHighRate*8),0,100)}
function contrib(f){const labels=['Missed-session rate','Session-duration ratio','High-fatigue frequency','Too-hard difficulty reports','Engagement trajectory','Average engagement','Engagement volatility','Late-session rate'];return FEATURES.map((name,i)=>({name,label:labels[i],impact:model.weights[i]*vector(f)[i]})).sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact))}
function policyFor(r){return(Store.state.policies||DEFAULT_POLICIES).find(p=>r>=Number(p.min_risk)&&r<=Number(p.max_risk))||DEFAULT_POLICIES[2]}

async function runEngine(source='manual'){
 const p=patient(),f=computeFeatures(),r=risk(f),pol=policyFor(r);if(!p)return;
 const rec={id:uid('dec'),patient_id:p.id,model_version:model.version,risk:r,confidence:confidence(f),features:f,top_signals:contrib(f).slice(0,4),recommendation:pol.recommendation,requires_approval:!!pol.requires_approval,status:pol.requires_approval?'pending_provider':'monitoring',source,created_at:now()};
 await Store.addDecision(rec);render();toast(`Bazi decision recorded: ${r}% risk`);
}

function currentDecision(){return Store.state.decisions.find(d=>d.patient_id===Store.state.activePatientId)}
function render(){if(!Store.state)return;const p=patient();if(!p)return;const f=computeFeatures(),r=risk(f),e=engagement(f),d=currentDecision();
 $('#orgName').textContent=Store.state.organization?.name||'Bazi workspace';$('#modeBadge').textContent=Store.mode==='supabase'?'Supabase connected':'Local development';$('#modeBadge').className=`mode-badge ${Store.mode==='supabase'?'connected':''}`;$('#userEmail').textContent=Store.state.user?.email||'—';$('#userRole').textContent=Store.state.user?.role||'—';
 $('#patientName').textContent=p.display_name;$('#patientPathway').textContent=p.pathway;$('#riskStat').textContent=`${r}%`;$('#riskStat').className=`stat ${r>=70?'status-high':r>=40?'status-moderate':'status-low'}`;$('#engagementStat').textContent=e;$('#eventStat').textContent=events().length;$('#decisionStat').textContent=Store.state.decisions.filter(x=>x.patient_id===p.id).length;$('#modelMeta').textContent=`${MODEL_VERSION} · ${model.samples.toLocaleString()} synthetic training trajectories`;
 renderPatients();renderFeatures(f);renderEvents();renderDecision(d,r);renderPolicies();renderAudit();
}
function renderPatients(){const q=($('#patientSearch')?.value||'').toLowerCase();$('#patientList').innerHTML=Store.state.patients.filter(p=>`${p.display_name} ${p.external_id} ${p.pathway}`.toLowerCase().includes(q)).map(p=>`<button class="patient-item ${p.id===Store.state.activePatientId?'active':''}" data-patient="${p.id}"><strong>${esc(p.display_name)}</strong><span>${esc(p.pathway)} · ${esc(p.external_id)}</span></button>`).join('');$$('[data-patient]').forEach(b=>b.onclick=()=>{Store.state.activePatientId=b.dataset.patient;Store.persist();render()})}
function renderFeatures(f){const vals=[['Missed',`${Math.round(f.missedRate*100)}%`],['Duration',`${Math.round(f.durationRatio*100)}% baseline`],['Slope',`${f.engagementSlope.toFixed(1)}/session`],['Volatility',f.volatility.toFixed(1)]];$('#featureGrid').innerHTML=vals.map(([l,v])=>`<div class="mini-stat"><strong>${v}</strong><span>${l}</span></div>`).join('')}
function renderEvents(){$('#eventsBody').innerHTML=events().slice().reverse().map(e=>`<tr><td>${new Date(e.occurred_at).toLocaleDateString()}</td><td>${esc(e.status)}</td><td>${Number(e.duration_minutes||0)} min</td><td>${esc(e.fatigue||'—')}</td><td>${esc(e.difficulty||'—')}</td><td><strong>${Number(e.engagement??0)}</strong></td></tr>`).join('')||'<tr><td colspan="6" class="muted">No events yet.</td></tr>'}
function renderDecision(d,r){if(!d){$('#decisionPanel').innerHTML=`<div class="notice">No decision has been recorded for this patient yet. Current model risk is ${r}%.</div>`;return}$('#decisionPanel').innerHTML=`<div class="mini-grid"><div class="mini-stat"><strong>${d.risk}%</strong><span>Recorded risk</span></div><div class="mini-stat"><strong>${d.confidence}%</strong><span>Confidence</span></div><div class="mini-stat"><strong>${esc(d.status)}</strong><span>Status</span></div><div class="mini-stat"><strong>${esc(d.model_version)}</strong><span>Model</span></div></div><p>${esc(d.recommendation)}</p><div class="notice">Top signals: ${(d.top_signals||[]).map(s=>esc(s.label)).join(', ')||'not available'}</div><div class="action-stack" style="margin-top:12px">${d.requires_approval&&d.status==='pending_provider'?`<button class="primary" id="approveDecision">Provider approve</button><button id="dismissDecision">Dismiss</button>`:''}</div>`;if($('#approveDecision'))$('#approveDecision').onclick=async()=>{await Store.updateDecision(d.id,'provider_approved');render();toast('Decision approved and audit record updated')};if($('#dismissDecision'))$('#dismissDecision').onclick=async()=>{await Store.updateDecision(d.id,'dismissed');render();toast('Decision dismissed')};}
function renderPolicies(){$('#policyList').innerHTML=(Store.state.policies||[]).map(p=>`<div class="policy-row"><div><strong>${Number(p.min_risk)}–${Number(p.max_risk)}% risk</strong><div class="muted">${esc(p.recommendation)}</div></div><span class="workspace-badge">${p.requires_approval?'approval required':'monitor'}</span></div>`).join('')}
function renderAudit(){const rows=Store.state.decisions.filter(d=>d.patient_id===Store.state.activePatientId).slice(0,12);$('#auditList').innerHTML=rows.map(d=>`<div class="decision-row"><div><strong>${d.risk}% · ${esc(d.recommendation)}</strong><div class="muted">${new Date(d.created_at||d.timestamp).toLocaleString()} · ${esc(d.model_version)}</div></div><span class="workspace-badge">${esc(d.status)}</span></div>`).join('')||'<div class="muted">No audit records yet.</div>'}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2600)}
function copilot(q){const p=patient(),f=computeFeatures(),r=risk(f),pol=policyFor(r),top=contrib(f).slice(0,3),t=q.toLowerCase();if(t.includes('why')||t.includes('risk'))return `${p.display_name}'s current modeled 7-day disengagement risk is ${r}%. The strongest current signals are ${top.map(x=>x.label.toLowerCase()).join(', ')}. Engagement slope is ${f.engagementSlope.toFixed(1)} points/session.`;if(t.includes('who')||t.includes('attention')){const scored=Store.state.patients.map(x=>{const old=Store.state.activePatientId;Store.state.activePatientId=x.id;const rr=risk(computeFeatures());Store.state.activePatientId=old;return{name:x.display_name,r:rr}}).sort((a,b)=>b.r-a.r).slice(0,3);return `Highest current modeled risk: ${scored.map(x=>`${x.name} ${x.r}%`).join('; ')}.`}if(t.includes('do')||t.includes('recommend'))return `The configured policy for ${r}% risk permits: ${pol.recommendation} ${pol.requires_approval?'Provider approval is required.':'No approval escalation is required.'}`;return `${p.display_name}: ${events().length} events, engagement state ${engagement(f)}, modeled risk ${r}%. Ask me why risk changed, who needs attention, or what the active policy permits.`}

function wire(){
 $('#patientSearch').oninput=renderPatients;$('#runEngine').onclick=()=>runEngine('manual');$('#addEvent').onclick=()=>$('#eventDialog').showModal();$('#addPatient').onclick=()=>$('#patientDialog').showModal();
 $('#eventForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);await Store.addEvent(Store.state.activePatientId,{status:fd.get('status'),duration_minutes:Number(fd.get('duration')),fatigue:fd.get('fatigue'),difficulty:fd.get('difficulty'),engagement:Number(fd.get('engagement'))});$('#eventDialog').close();await runEngine('event_ingestion')};
 $('#patientForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);await Store.addPatient({display_name:fd.get('name'),pathway:fd.get('pathway'),baseline_duration:Number(fd.get('duration')),baseline_engagement:Number(fd.get('engagement'))});$('#patientDialog').close();render();toast('Patient added')};
 $$('.dialog-close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
 $('#copilotForm').onsubmit=e=>{e.preventDefault();const input=$('#copilotInput'),q=input.value.trim();if(!q)return;$('#copilotThread').insertAdjacentHTML('beforeend',`<div class="chat user">${esc(q)}</div><div class="chat ai">${esc(copilot(q))}</div>`);input.value='';$('#copilotThread').scrollTop=$('#copilotThread').scrollHeight};
 $('#resetLocal').onclick=()=>{if(Store.mode!=='local'){toast('Reset is only available in local development mode');return}localStorage.removeItem(LOCAL_KEY);Store.state=defaultLocal();Store.persist();render();toast('Local sandbox reset')};
 $('#signOut').onclick=async()=>{await Store.signOut();location.reload()};
 $('#authForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),res=await Store.signIn(fd.get('email'),fd.get('password'));if(!res.ok){$('#authError').textContent=res.error;return}$('#authGate').classList.add('hidden');render()};
}

async function boot(){model=train(syntheticRows());const ready=await Store.init();wire();if(Store.mode==='local'){$('#authGate').classList.add('hidden');render()}else if(ready){$('#authGate').classList.add('hidden');render()}else{$('#authGate').classList.remove('hidden')} }
boot().catch(err=>{console.error(err);const gate=$('#authGate');gate.classList.remove('hidden');$('#authError').textContent=err.message||String(err)});
})();
