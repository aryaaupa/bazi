(() => {
  'use strict';

  const STORAGE_KEY = 'bazi-alpha-state-v1';
  const MODEL_VERSION = 'bazi-risk-lr-synth-v0.1';
  const FEATURE_NAMES = ['missedRate','durationRatio','fatigueHighRate','tooHardRate','engagementSlope','engagementMean','volatility','lateRate'];

  const seedEvents = () => [
    {date:'2026-08-01',status:'completed',duration:27,fatigue:'low',difficulty:'appropriate',engagement:88},
    {date:'2026-08-03',status:'completed',duration:26,fatigue:'low',difficulty:'appropriate',engagement:86},
    {date:'2026-08-05',status:'late',duration:23,fatigue:'medium',difficulty:'appropriate',engagement:79},
    {date:'2026-08-08',status:'shortened',duration:15,fatigue:'high',difficulty:'too-hard',engagement:66},
    {date:'2026-08-11',status:'skipped',duration:0,fatigue:'high',difficulty:'too-hard',engagement:49}
  ];

  const defaultState = () => ({
    patient:{id:'BZ-PT-001',name:'Maya Chen',baselineDuration:26,baselineEngagement:87},
    events:seedEvents(), decisions:[], lastDecision:null
  });

  let state = loadState();
  let model = null;

  function loadState(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState(); }
    catch { return defaultState(); }
  }
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);
  const sigmoid=x=>1/(1+Math.exp(-x));

  function seededRandom(seed=41731){
    let s=seed>>>0;
    return ()=>{ s=(1664525*s+1013904223)>>>0; return s/4294967296; };
  }

  function makeSyntheticTrainingSet(n=1800){
    const rand=seededRandom(90317), rows=[];
    for(let i=0;i<n;i++){
      const missedRate=rand()*.75;
      const durationRatio=.25+rand()*.85;
      const fatigueHighRate=rand()*.85;
      const tooHardRate=rand()*.75;
      const engagementSlope=-16+rand()*22;
      const engagementMean=35+rand()*60;
      const volatility=rand()*24;
      const lateRate=rand()*.7;
      const latent=-1.65 + 3.0*missedRate - 1.8*durationRatio + 1.75*fatigueHighRate + 1.5*tooHardRate - .095*engagementSlope - .025*(engagementMean-65) + .045*volatility + 1.0*lateRate + (rand()-.5)*1.3;
      const p=sigmoid(latent);
      rows.push({x:[missedRate,durationRatio,fatigueHighRate,tooHardRate,engagementSlope/20,engagementMean/100,volatility/25,lateRate],y:rand()<p?1:0});
    }
    return rows;
  }

  function trainLogisticRegression(rows, epochs=520, lr=.18){
    const w=new Array(FEATURE_NAMES.length).fill(0); let b=0;
    for(let e=0;e<epochs;e++){
      const gw=new Array(w.length).fill(0); let gb=0;
      for(const row of rows){
        let z=b; for(let j=0;j<w.length;j++) z+=w[j]*row.x[j];
        const err=sigmoid(z)-row.y;
        for(let j=0;j<w.length;j++) gw[j]+=err*row.x[j]; gb+=err;
      }
      const scale=1/rows.length;
      for(let j=0;j<w.length;j++) w[j]-=lr*gw[j]*scale;
      b-=lr*gb*scale;
    }
    let correct=0;
    for(const row of rows){
      let z=b; for(let j=0;j<w.length;j++) z+=w[j]*row.x[j];
      if((sigmoid(z)>=.5?1:0)===row.y) correct++;
    }
    return {weights:w,bias:b,trainingAccuracy:correct/rows.length,version:MODEL_VERSION,samples:rows.length};
  }

  function regressionSlope(values){
    if(values.length<2)return 0;
    const n=values.length, meanX=(n-1)/2, meanY=values.reduce((a,b)=>a+b,0)/n;
    let num=0,den=0; values.forEach((v,i)=>{num+=(i-meanX)*(v-meanY);den+=(i-meanX)**2});
    return den?num/den:0;
  }

  function std(values){
    if(!values.length)return 0; const m=values.reduce((a,b)=>a+b,0)/values.length;
    return Math.sqrt(values.reduce((a,b)=>a+(b-m)**2,0)/values.length);
  }

  function computeFeatures(events=state.events){
    const recent=events.slice(-6), n=Math.max(recent.length,1), completed=recent.filter(e=>e.status!=='skipped');
    const engagement=recent.map(e=>Number(e.engagement)||0);
    const avgDuration=completed.length?completed.reduce((s,e)=>s+Number(e.duration||0),0)/completed.length:0;
    return {
      missedRate:recent.filter(e=>e.status==='skipped').length/n,
      durationRatio:clamp(avgDuration/state.patient.baselineDuration,0,1.5),
      fatigueHighRate:recent.filter(e=>e.fatigue==='high').length/n,
      tooHardRate:recent.filter(e=>e.difficulty==='too-hard').length/n,
      engagementSlope:regressionSlope(engagement),
      engagementMean:engagement.length?engagement.reduce((a,b)=>a+b,0)/engagement.length:0,
      volatility:std(engagement),
      lateRate:recent.filter(e=>e.status==='late').length/n
    };
  }

  function vectorize(f){return [f.missedRate,f.durationRatio,f.fatigueHighRate,f.tooHardRate,f.engagementSlope/20,f.engagementMean/100,f.volatility/25,f.lateRate]}

  function predictRisk(features){
    const x=vectorize(features); let z=model.bias;
    model.weights.forEach((w,i)=>z+=w*x[i]);
    const raw=sigmoid(z);
    return clamp(Math.round(raw*100),2,98);
  }

  function engagementState(features){
    const score=clamp(Math.round(features.engagementMean + Math.min(features.engagementSlope*2,8) - features.missedRate*18 - features.fatigueHighRate*8),0,100);
    return score;
  }

  function contributions(features){
    const x=vectorize(features);
    const readable={
      missedRate:'Missed-session rate',durationRatio:'Session-duration ratio',fatigueHighRate:'High-fatigue frequency',tooHardRate:'Too-hard difficulty reports',engagementSlope:'Engagement trajectory',engagementMean:'Average engagement',volatility:'Engagement volatility',lateRate:'Late-session rate'
    };
    return FEATURE_NAMES.map((name,i)=>({name,label:readable[name],impact:model.weights[i]*x[i]})).sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact));
  }

  const POLICY = [
    {id:'continue',min:0,max:39,label:'Continue current plan and monitor',requiresApproval:false},
    {id:'friction',min:40,max:69,label:'Reduce non-clinical friction: adjust reminder timing and request a brief engagement check-in',requiresApproval:true},
    {id:'review',min:70,max:100,label:'Escalate for provider review before any treatment-plan change',requiresApproval:true}
  ];

  function chooseAction(risk){return POLICY.find(p=>risk>=p.min&&risk<=p.max)}

  function confidence(features){
    const n=Math.min(state.events.length,6), coverage=n/6;
    const separation=Math.abs(predictRisk(features)-50)/50;
    return clamp(Math.round((.45+.35*coverage+.20*separation)*100),45,96);
  }

  function runEngine(source='manual'){
    const features=computeFeatures();
    const risk=predictRisk(features);
    const action=chooseAction(risk);
    const top=contributions(features).slice(0,4);
    const record={
      id:`BZ-${Date.now().toString(36).toUpperCase()}`,
      timestamp:new Date().toISOString(), patientId:state.patient.id, source,
      modelVersion:model.version, risk, confidence:confidence(features), features,
      topSignals:top, policyId:action.id, recommendation:action.label,
      requiresApproval:action.requiresApproval, status:action.requiresApproval?'pending_provider':'monitoring'
    };
    state.lastDecision=record; state.decisions.unshift(record); save(); render(); return record;
  }

  function approveDecision(){
    if(!state.lastDecision)return;
    const d=state.decisions.find(x=>x.id===state.lastDecision.id); if(d){d.status='provider_approved';d.approvedAt=new Date().toISOString();state.lastDecision=d;save();render()}
  }
  function dismissDecision(){
    if(!state.lastDecision)return;
    const d=state.decisions.find(x=>x.id===state.lastDecision.id); if(d){d.status='dismissed';d.dismissedAt=new Date().toISOString();state.lastDecision=d;save();render()}
  }

  function addEvent(event){
    state.events.push({...event,date:new Date().toISOString().slice(0,10)}); save(); runEngine('event_ingestion');
  }

  function riskClass(risk){return risk>=70?'high':risk>=40?'moderate':'success'}

  function render(){
    const f=computeFeatures(), risk=predictRisk(f), engagement=engagementState(f), slope=f.engagementSlope;
    $('#riskValue').textContent=`${risk}%`; $('#riskBar').style.width=`${risk}%`; $('#riskBar').style.background=risk>=70?'#e26767':risk>=40?'#e8ad52':'#2bc47d';
    const badge=$('#riskBadge'); badge.textContent=risk>=70?'High risk':risk>=40?'Moderate risk':'Low risk'; badge.className=`badge ${riskClass(risk)}`;
    $('#engagementValue').textContent=engagement; $('#engagementBar').style.width=`${engagement}%`;
    $('#trendBadge').textContent=slope<-2?`↓ ${Math.abs(slope).toFixed(1)}/session`:slope>2?`↑ ${slope.toFixed(1)}/session`:'Stable';
    $('#modelStatus').textContent='Active'; $('#modelMeta').textContent=`${model.version} · ${model.samples.toLocaleString()} synthetic trajectories · ${(model.trainingAccuracy*100).toFixed(0)}% train accuracy`;
    $('#eventCount').textContent=`${state.events.length} events`;
    renderEvents(); renderChart(); renderFeatures(f); renderDecision(); renderLog();
  }

  function renderEvents(){
    $('#eventsBody').innerHTML=state.events.slice().reverse().map(e=>`<tr><td>${e.date}</td><td>${labelStatus(e.status)}</td><td>${e.duration} min</td><td>${e.fatigue}</td><td>${e.difficulty}</td><td><strong>${e.engagement}</strong></td></tr>`).join('');
  }
  function labelStatus(v){return ({completed:'Completed',late:'Completed late',shortened:'Shortened',skipped:'Skipped'})[v]||v}

  function renderFeatures(f){
    const items=[['Missed rate',`${Math.round(f.missedRate*100)}%`],['Duration vs baseline',`${Math.round(f.durationRatio*100)}%`],['Engagement slope',`${f.engagementSlope.toFixed(1)}/session`],['Volatility',f.volatility.toFixed(1)]];
    $('#featureStrip').innerHTML=items.map(([l,v])=>`<div class="feature"><strong>${v}</strong><span>${l}</span></div>`).join('');
  }

  function renderChart(){
    const svg=$('#trajectoryChart'), vals=state.events.map(e=>Number(e.engagement)); svg.innerHTML='';
    const W=820,H=310,m={l:45,r:25,t:24,b:42}, iw=W-m.l-m.r,ih=H-m.t-m.b;
    const x=i=>m.l+(vals.length<=1?0:i/(vals.length-1))*iw, y=v=>m.t+(100-v)/100*ih;
    [0,25,50,75,100].forEach(t=>{svg.insertAdjacentHTML('beforeend',`<line x1="${m.l}" y1="${y(t)}" x2="${W-m.r}" y2="${y(t)}" stroke="#20302b"/><text x="${m.l-10}" y="${y(t)+4}" fill="#6d8379" font-size="10" text-anchor="end">${t}</text>`)});
    if(vals.length){const pts=vals.map((v,i)=>`${x(i)},${y(v)}`).join(' ');svg.insertAdjacentHTML('beforeend',`<polyline points="${pts}" fill="none" stroke="#2bc47d" stroke-width="3"/>`);vals.forEach((v,i)=>svg.insertAdjacentHTML('beforeend',`<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="#0d1512" stroke="#78e2ad" stroke-width="2"/><text x="${x(i)}" y="${H-17}" fill="#71877d" font-size="10" text-anchor="middle">S${i+1}</text>`))}
  }

  function renderDecision(){
    const d=state.lastDecision;
    if(!d){$('#decisionEmpty').classList.remove('hidden');$('#decisionResult').classList.add('hidden');return}
    $('#decisionEmpty').classList.add('hidden');$('#decisionResult').classList.remove('hidden');
    $('#decisionRisk').textContent=`${d.risk}%`; $('#decisionConfidence').textContent=`${d.confidence}%`;
    $('#decisionTitle').textContent=d.risk>=70?'Trajectory deterioration requires review':d.risk>=40?'Early disengagement pattern detected':'No intervention threshold reached';
    $('#decisionReason').textContent=d.risk>=70?'Bazi detected a multi-signal deterioration pattern across recent sessions. The policy layer prevents autonomous treatment changes and routes the case to provider review.':d.risk>=40?'The risk model identified a meaningful departure from the patient baseline. Bazi is limited to provider-approved, non-clinical engagement actions.':'Current behavior remains within the configured monitoring range.';
    $('#signalList').innerHTML=d.topSignals.map(s=>`<li><strong>${s.label}</strong> · ${s.impact>=0?'increases':'reduces'} modeled risk</li>`).join('');
    $('#recommendationAction').textContent=d.recommendation;
    $('#approveBtn').classList.toggle('hidden',!d.requiresApproval||d.status==='provider_approved');
    $('#approveBtn').textContent=d.status==='provider_approved'?'Approved':'Provider approve';
  }

  function renderLog(){
    const log=$('#decisionLog');
    if(!state.decisions.length){log.innerHTML='<div class="empty-state" style="min-height:140px"><p>No decisions recorded yet.</p></div>';return}
    log.innerHTML=state.decisions.slice(0,20).map(d=>`<div class="log-entry"><span>${new Date(d.timestamp).toLocaleString()}</span><strong>${d.risk}% risk</strong><span>${d.recommendation}</span><strong>${d.status.replaceAll('_',' ')}</strong></div>`).join('');
  }

  function copilotAnswer(q){
    const f=computeFeatures(), risk=predictRisk(f), action=chooseAction(risk), top=contributions(f).slice(0,3), text=q.toLowerCase();
    if(text.includes('why')||text.includes('change')) return `Risk is ${risk}%. The strongest modeled signals are ${top.map(s=>s.label.toLowerCase()).join(', ')}. Engagement is trending ${f.engagementSlope<0?'down':'up'} at ${Math.abs(f.engagementSlope).toFixed(1)} points per session. This answer comes from the current patient state, not a canned response.`;
    if(text.includes('what should')||text.includes('recommend')||text.includes('do')) return `The active policy permits: “${action.label}”. ${action.requiresApproval?'Provider approval is required before action.':'No escalation is currently required.'}`;
    if(text.includes('summary')||text.includes('patient')) return `${state.patient.name} has ${state.events.length} recorded sessions, ${Math.round(f.missedRate*100)}% missed-session rate, ${Math.round(f.durationRatio*100)}% of baseline session duration, and a ${risk}% modeled 7-day disengagement risk. Current engagement slope is ${f.engagementSlope.toFixed(1)} points per session.`;
    if(text.includes('model')) return `${model.version} is a logistic regression model trained locally on ${model.samples.toLocaleString()} seeded synthetic trajectories. It is functional research software, not a clinically validated model.`;
    return `I can answer from Bazi's current structured state. Ask why risk changed, what Bazi recommends, for a patient summary, or about the current model.`;
  }

  function addMessage(role,text){const el=document.createElement('div');el.className=`msg ${role}`;el.textContent=text;$('#copilotMessages').appendChild(el);$('#copilotMessages').scrollTop=$('#copilotMessages').scrollHeight}
  function askCopilot(text){if(!text.trim())return;addMessage('user',text);setTimeout(()=>addMessage('ai',copilotAnswer(text)),120)}

  function exportJSON(){
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),model:{version:model.version,samples:model.samples,trainingAccuracy:model.trainingAccuracy},state},null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`bazi-${state.patient.id}-decision-record.json`;a.click();URL.revokeObjectURL(a.href);
  }

  function $ (s){return document.querySelector(s)}

  function bind(){
    $('#runEngineBtn').addEventListener('click',()=>runEngine('manual'));
    $('#approveBtn').addEventListener('click',approveDecision); $('#dismissBtn').addEventListener('click',dismissDecision);
    $('#addEventBtn').addEventListener('click',()=>$('#eventDialog').showModal()); $('#closeDialog').addEventListener('click',()=>$('#eventDialog').close());
    $('#eventForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);addEvent({status:fd.get('status'),duration:Number(fd.get('duration')),fatigue:fd.get('fatigue'),difficulty:fd.get('difficulty'),engagement:Number(fd.get('engagement'))});$('#eventDialog').close();});
    $('#resetBtn').addEventListener('click',()=>{state=defaultState();save();render();addMessage('ai','Patient state reset to the synthetic seed trajectory.');});
    $('#exportBtn').addEventListener('click',exportJSON);
    $('#copilotForm').addEventListener('submit',e=>{e.preventDefault();const input=$('#copilotInput');askCopilot(input.value);input.value='';});
    document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>askCopilot(b.dataset.prompt)));
    document.querySelectorAll('[data-scroll]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.scroll).scrollIntoView({behavior:'smooth'})));
  }

  function init(){
    const rows=makeSyntheticTrainingSet(); model=trainLogisticRegression(rows); bind(); render();
    addMessage('ai',`Bazi is live. ${model.version} trained locally on ${model.samples.toLocaleString()} synthetic trajectories. Ask me about the current patient state.`);
  }
  init();
})();