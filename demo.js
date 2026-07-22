
(() => {
  "use strict";

  const initialState = () => ({
    engagement: 82,
    risk: 18,
    adapted: false,
    baziRunIndex: null,
    projected: [],
    sessions: [
      { label: "S1", status: "completed", duration: 25, fatigue: "low", difficulty: "appropriate", engagement: 84 },
      { label: "S2", status: "late", duration: 22, fatigue: "medium", difficulty: "appropriate", engagement: 78 },
      { label: "S3", status: "shortened", duration: 14, fatigue: "high", difficulty: "too-hard", engagement: 63 },
      { label: "S4", status: "skipped", duration: 0, fatigue: "high", difficulty: "too-hard", engagement: 45 }
    ],
    activities: [
      { title: "Demo patient loaded", detail: "Maya Chen, Week 3 rehabilitation plan" },
      { title: "Behavioral decline detected in timeline", detail: "Recent sessions show reduced completion and duration" }
    ]
  });

  let state = initialState();
  let previousFocus = null;
  let analysisTimers = [];
  let toastTimer = null;

  const $ = (id) => document.getElementById(id);
  const els = {
    engagementValue: $("engagement-value"),
    engagementTrend: $("engagement-trend"),
    engagementProgress: $("engagement-progress"),
    riskValue: $("risk-value"),
    riskProgress: $("risk-progress"),
    riskLevelBadge: $("risk-level-badge"),
    completionValue: $("completion-value"),
    durationValue: $("duration-value"),
    sessionsBody: $("sessions-table-body"),
    activityList: $("activity-list"),
    chart: $("engagement-chart"),
    simulateButton: $("simulate-button"),
    runButton: $("run-bazi-button"),
    resetButton: $("reset-button"),
    modal: $("session-modal"),
    modalClose: $("modal-close"),
    modalCancel: $("modal-cancel"),
    sessionForm: $("session-form"),
    recommendationState: $("recommendation-state"),
    recommendationEmpty: $("recommendation-empty"),
    analysisState: $("analysis-state"),
    analysisStep: $("analysis-step"),
    analysisProgressBar: $("analysis-progress-bar"),
    recommendationResult: $("recommendation-result"),
    resultRisk: $("result-risk"),
    resultLevel: $("result-level"),
    primaryReason: $("primary-reason"),
    recommendationExplanation: $("recommendation-explanation"),
    signalList: $("signal-list"),
    actionsList: $("recommended-actions-list"),
    applyButton: $("apply-button"),
    dismissButton: $("dismiss-button"),
    planTitle: $("plan-title"),
    planStatus: $("plan-status"),
    planDuration: $("plan-duration"),
    planDifficulty: $("plan-difficulty"),
    planFrequency: $("plan-frequency"),
    planReminder: $("plan-reminder"),
    planProgression: $("plan-progression"),
    planEscalation: $("plan-escalation"),
    planComparison: $("plan-comparison"),
    toast: $("toast"),
    demoMenuToggle: document.querySelector(".demo-menu-toggle"),
    demoSidebar: document.querySelector(".demo-sidebar")
  };

  const statusLabels = {
    completed: "Completed",
    late: "Completed late",
    shortened: "Shortened",
    skipped: "Skipped"
  };

  const fatigueLabels = { low: "Low", medium: "Medium", high: "High" };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const getRiskLevel = (risk) => risk >= 70 ? "High" : risk >= 40 ? "Moderate" : "Low";

  function calculateRisk() {
    const recent = state.sessions.slice(-4);
    let risk = 20;
    recent.forEach((session) => {
      if (session.status === "skipped") risk += 25;
      if (session.status === "shortened") risk += 12;
      if (session.status === "late") risk += 6;
      if (session.fatigue === "high") risk += 8;
    });
    if (state.engagement < 65) risk += 15;
    if (state.engagement < 50) risk += 10;
    return clamp(risk, 0, 100);
  }

  function calculateCompletionRate() {
    const completed = state.sessions.filter((s) => s.status !== "skipped").length;
    return state.sessions.length ? Math.round((completed / state.sessions.length) * 100) : 0;
  }

  function calculateAverageDuration() {
    const total = state.sessions.reduce((sum, s) => sum + s.duration, 0);
    return state.sessions.length ? Math.round(total / state.sessions.length) : 0;
  }

  function sessionImpact(status, fatigue, difficulty) {
    const base = { completed: 3, late: -4, shortened: -8, skipped: -15 };
    const fatigueModifier = { low: 0, medium: -2, high: -5 };
    const difficultyModifier = { easy: 1, appropriate: 0, "too-hard": -6 };
    return base[status] + fatigueModifier[fatigue] + difficultyModifier[difficulty];
  }

  function addActivity(title, detail) {
    state.activities.unshift({ title, detail });
    renderActivity();
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.remove("hidden");
    toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 3500);
  }

  function renderMetrics() {
    state.engagement = state.sessions.at(-1)?.engagement ?? state.engagement;
    const riskLevel = getRiskLevel(state.risk);

    els.engagementValue.textContent = String(state.engagement);
    els.engagementProgress.style.width = `${state.engagement}%`;
    els.riskValue.textContent = `${state.risk}%`;
    els.riskProgress.style.width = `${state.risk}%`;
    els.completionValue.textContent = `${calculateCompletionRate()}%`;
    els.durationValue.textContent = `${calculateAverageDuration()} min`;

    const diff = state.engagement - 82;
    els.engagementTrend.textContent = diff === 0 ? "Baseline" : `${diff > 0 ? "+" : ""}${diff} from baseline`;
    els.riskLevelBadge.textContent = riskLevel;
    els.riskLevelBadge.className = `risk-badge risk-${riskLevel.toLowerCase()}`;
  }

  function renderSessions() {
    els.sessionsBody.innerHTML = "";
    state.sessions.slice().reverse().forEach((session) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${session.label}</td>
        <td><span class="status-chip status-${session.status}">${statusLabels[session.status]}</span></td>
        <td>${session.duration} min</td>
        <td>${fatigueLabels[session.fatigue]}</td>
        <td><strong>${session.engagement}</strong></td>`;
      els.sessionsBody.appendChild(row);
    });
  }

  function renderActivity() {
    els.activityList.innerHTML = "";
    state.activities.slice(0, 7).forEach((activity) => {
      const item = document.createElement("li");
      item.innerHTML = `<strong>${activity.title}</strong><span>${activity.detail}</span>`;
      els.activityList.appendChild(item);
    });
  }

  function renderPlan() {
    if (state.adapted) {
      els.planTitle.textContent = "Bazi-adapted rehabilitation plan";
      els.planStatus.textContent = "Adapted";
      els.planDuration.textContent = "15 minutes";
      els.planDifficulty.textContent = "Low-Moderate";
      els.planFrequency.textContent = "4 sessions per week";
      els.planReminder.textContent = "6:30 PM";
      els.planProgression.textContent = "Slower progression for three sessions";
      els.planEscalation.textContent = "Clinician check-in after another missed session";
      els.planComparison.classList.remove("hidden");
    } else {
      els.planTitle.textContent = "Standard rehabilitation plan";
      els.planStatus.textContent = "Active";
      els.planDuration.textContent = "25 minutes";
      els.planDifficulty.textContent = "Moderate";
      els.planFrequency.textContent = "4 sessions per week";
      els.planReminder.textContent = "8:00 AM";
      els.planProgression.textContent = "Standard progression";
      els.planEscalation.textContent = "No escalation rule";
      els.planComparison.classList.add("hidden");
    }
  }

  function svgElement(tag, attributes = {}) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([k, v]) => node.setAttribute(k, String(v)));
    return node;
  }

  function renderChart() {
    const svg = els.chart;
    svg.innerHTML = "";
    const width = 820, height = 340;
    const margin = { top: 30, right: 42, bottom: 54, left: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const all = state.sessions.map((s) => s.engagement).concat(state.projected);
    const count = Math.max(all.length, 2);
    const x = (i) => margin.left + (i / (count - 1)) * innerWidth;
    const y = (v) => margin.top + ((100 - v) / 100) * innerHeight;

    [0,25,50,75,100].forEach((tick) => {
      svg.appendChild(svgElement("line",{x1:margin.left,y1:y(tick),x2:width-margin.right,y2:y(tick),class:"chart-grid-line"}));
      const label = svgElement("text",{x:margin.left-12,y:y(tick)+4,"text-anchor":"end",class:"chart-axis-label"});
      label.textContent = tick;
      svg.appendChild(label);
    });

    const points = state.sessions.map((s,i)=>`${x(i)},${y(s.engagement)}`).join(" ");
    svg.appendChild(svgElement("polyline",{points,class:"chart-observed"}));

    state.sessions.forEach((s,i)=>{
      const c = svgElement("circle",{cx:x(i),cy:y(s.engagement),r:i===state.sessions.length-1?6:5,class:i===state.sessions.length-1?"chart-data-point chart-data-point-latest":"chart-data-point"});
      const t = svgElement("title"); t.textContent = `${s.label}: ${statusLabels[s.status]}, engagement ${s.engagement}`; c.appendChild(t); svg.appendChild(c);
      const l = svgElement("text",{x:x(i),y:height-24,"text-anchor":"middle",class:"chart-session-label"}); l.textContent=s.label; svg.appendChild(l);
    });

    if (state.baziRunIndex !== null) {
      const mx = x(state.baziRunIndex);
      svg.appendChild(svgElement("line",{x1:mx,y1:margin.top,x2:mx,y2:height-margin.bottom,class:"chart-intervention-marker"}));
      const l = svgElement("text",{x:mx+8,y:margin.top+13,class:"chart-intervention-label"}); l.textContent="Bazi run"; svg.appendChild(l);
    }

    if (state.projected.length) {
      const vals=[state.sessions.at(-1).engagement,...state.projected];
      const start=state.sessions.length-1;
      svg.appendChild(svgElement("polyline",{points:vals.map((v,i)=>`${x(start+i)},${y(v)}`).join(" "),class:"chart-projected"}));
      state.projected.forEach((v,i)=>{
        const idx=state.sessions.length+i;
        svg.appendChild(svgElement("circle",{cx:x(idx),cy:y(v),r:4.5,fill:"#fff",stroke:"#239D58","stroke-width":2.5}));
        const l=svgElement("text",{x:x(idx),y:height-24,"text-anchor":"middle",class:"chart-session-label"});l.textContent=`P${i+1}`;svg.appendChild(l);
      });
    }
  }

  function renderAll(){ renderMetrics(); renderSessions(); renderActivity(); renderPlan(); renderChart(); }

  function openModal(){ previousFocus=document.activeElement; els.modal.classList.remove("hidden"); document.body.classList.add("modal-open"); els.modalClose.focus(); }
  function closeModal(){ els.modal.classList.add("hidden"); document.body.classList.remove("modal-open"); previousFocus?.focus(); }

  function clearAnalysisTimers(){ analysisTimers.forEach(clearTimeout); analysisTimers=[]; }

  function resetRecommendationView(){
    clearAnalysisTimers();
    els.recommendationEmpty.classList.remove("hidden");
    els.analysisState.classList.add("hidden");
    els.recommendationResult.classList.add("hidden");
    els.recommendationState.textContent="Not run";
    els.recommendationState.className="recommendation-state";
    els.analysisProgressBar.style.width="0";
    els.runButton.disabled=false;
  }

  function getRecommendation(risk){
    const level=getRiskLevel(risk), recent=state.sessions.slice(-4), signals=[];
    if(recent.some(s=>s.status==="skipped"))signals.push("Recent missed session");
    if(recent.some(s=>s.status==="shortened"))signals.push("Shortened session duration");
    if(recent.some(s=>s.fatigue==="high"))signals.push("Increased fatigue");
    if(state.engagement<82)signals.push("Engagement below baseline");
    if(!signals.length)signals.push("No material negative pattern detected");

    if(level==="High")return{
      level,
      reason:"Rapid decline in session completion and duration",
      explanation:"Bazi detected a sustained engagement decline rather than a single missed session. Recent completion, duration, fatigue, and difficulty signals indicate that the current treatment plan may be creating too much friction.",
      signals,
      actions:["Reduce session duration to 15 minutes","Change difficulty to Low-Moderate","Move reminder to 6:30 PM","Slow progression for the next three sessions","Trigger clinician check-in after another missed session"]
    };
    if(level==="Moderate")return{
      level,
      reason:"Early engagement decline across recent sessions",
      explanation:"Bazi detected a moderate change in participation. A limited adjustment can reduce friction while preserving the current therapeutic structure.",
      signals,
      actions:["Reduce session duration to 20 minutes","Move reminder to 7:00 PM","Review engagement after two more sessions"]
    };
    return{
      level,
      reason:"Engagement remains within the expected range",
      explanation:"Bazi did not detect a sustained pattern that requires treatment adaptation. Continue the current plan and monitor future sessions.",
      signals,
      actions:["Continue the current treatment plan","Re-evaluate after the next two sessions"]
    };
  }

  function showRecommendation(){
    state.risk=calculateRisk();
    state.baziRunIndex=Math.max(0,state.sessions.length-1);
    const rec=getRecommendation(state.risk);
    els.resultRisk.textContent=`${state.risk}%`;
    els.resultLevel.textContent=rec.level;
    els.primaryReason.textContent=rec.reason;
    els.recommendationExplanation.textContent=rec.explanation;
    els.signalList.innerHTML=rec.signals.map(s=>`<li>${s}</li>`).join("");
    els.actionsList.innerHTML=rec.actions.map(a=>`<li>${a}</li>`).join("");
    els.analysisState.classList.add("hidden");
    els.recommendationResult.classList.remove("hidden");
    els.recommendationState.textContent=`${rec.level} risk`;
    els.recommendationState.className=`recommendation-state risk-${rec.level.toLowerCase()}`;
    els.applyButton.classList.toggle("hidden",rec.level!=="High");
    els.runButton.disabled=false;
    addActivity("Bazi engagement analysis completed",`${state.risk}% ${rec.level.toLowerCase()} disengagement risk`);
    renderMetrics();renderChart();
  }

  function runBazi(){
    clearAnalysisTimers();
    els.runButton.disabled=true;
    els.recommendationEmpty.classList.add("hidden");
    els.recommendationResult.classList.add("hidden");
    els.analysisState.classList.remove("hidden");
    els.recommendationState.textContent="Analyzing";
    els.analysisProgressBar.style.width="10%";
    const steps=[["Processing session history","25%"],["Detecting behavioral change","50%"],["Evaluating approved interventions","75%"],["Selecting next action","100%"]];
    steps.forEach(([text,progress],i)=>analysisTimers.push(setTimeout(()=>{els.analysisStep.textContent=text;els.analysisProgressBar.style.width=progress},i*500)));
    analysisTimers.push(setTimeout(showRecommendation,2100));
  }

  function applyAdaptation(){
    if(state.adapted){showToast("The adapted plan is already active.");return}
    state.adapted=true;
    const current=state.engagement;
    const first=Math.min(100,Math.max(current+8,55));
    const second=Math.min(100,Math.max(first+8,63));
    const third=Math.min(100,Math.max(second+8,71));
    state.projected=[first,second,third];
    addActivity("Treatment plan adapted","Approved changes applied with projected engagement recovery");
    renderPlan();renderChart();
    els.recommendationState.textContent="Applied";
    els.applyButton.disabled=true;
    els.applyButton.textContent="Adaptation Applied";
    showToast("Treatment plan adapted within approved intervention boundaries.");
  }

  function dismissRecommendation(){
    els.recommendationResult.classList.add("hidden");
    els.recommendationEmpty.classList.remove("hidden");
    els.recommendationState.textContent="Dismissed";
    addActivity("Recommendation dismissed","No treatment plan changes were applied");
  }

  function resetDemo(){
    clearAnalysisTimers();
    state=initialState();
    resetRecommendationView();
    els.applyButton.disabled=false;
    els.applyButton.textContent="Apply Adaptation";
    renderAll();
    showToast("Demo reset to the starting patient scenario.");
  }

  els.simulateButton.addEventListener("click",openModal);
  els.modalClose.addEventListener("click",closeModal);
  els.modalCancel.addEventListener("click",closeModal);
  els.runButton.addEventListener("click",runBazi);
  els.applyButton.addEventListener("click",applyAdaptation);
  els.dismissButton.addEventListener("click",dismissRecommendation);
  els.resetButton.addEventListener("click",resetDemo);
  els.modal.addEventListener("click",(e)=>{if(e.target===els.modal)closeModal()});
  document.addEventListener("keydown",(e)=>{if(e.key==="Escape"&&!els.modal.classList.contains("hidden"))closeModal()});

  els.sessionForm.addEventListener("submit",(event)=>{
    event.preventDefault();
    const data=new FormData(els.sessionForm);
    const status=String(data.get("status"));
    const fatigue=String(data.get("fatigue"));
    const difficulty=String(data.get("difficulty"));
    let duration=Number(data.get("duration"));
    if(!Number.isFinite(duration)||duration<0||duration>60){showToast("Enter a session duration between 0 and 60 minutes.");return}
    if(status==="skipped")duration=0;
    const prior=state.sessions.at(-1)?.engagement??state.engagement;
    const engagement=clamp(prior+sessionImpact(status,fatigue,difficulty),0,100);
    state.sessions.push({label:`S${state.sessions.length+1}`,status,duration,fatigue,difficulty,engagement});
    state.engagement=engagement;
    state.risk=calculateRisk();
    state.projected=[];
    state.adapted=false;
    addActivity(`${statusLabels[status]} session recorded`,`${duration} minutes, ${fatigueLabels[fatigue].toLowerCase()} fatigue, engagement ${engagement}`);
    resetRecommendationView();
    renderAll();
    closeModal();
    els.sessionForm.reset();
    showToast("Session added. Engagement and preliminary risk have been updated.");
  });

  document.querySelectorAll('input[name="status"]').forEach((radio)=>{
    radio.addEventListener("change",()=>{
      const durationInput=els.sessionForm.elements.duration;
      if(radio.checked&&radio.value==="skipped"){durationInput.value="0";durationInput.disabled=true}
      else if(radio.checked){durationInput.disabled=false;if(Number(durationInput.value)===0)durationInput.value="25"}
    });
  });

  if(els.demoMenuToggle&&els.demoSidebar){
    els.demoMenuToggle.addEventListener("click",()=>{
      const open=els.demoSidebar.classList.toggle("open");
      els.demoMenuToggle.setAttribute("aria-expanded",String(open));
    });
    els.demoSidebar.querySelectorAll("a").forEach((link)=>link.addEventListener("click",()=>{els.demoSidebar.classList.remove("open");els.demoMenuToggle.setAttribute("aria-expanded","false")}));
  }

  state.engagement=state.sessions.at(-1).engagement;
  state.risk=18;
  renderAll();
})();
