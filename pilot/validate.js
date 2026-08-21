(() => {
  'use strict';

  const sigmoid = x => 1 / (1 + Math.exp(-x));
  const clamp = (v,a,b) => Math.min(Math.max(v,a),b);

  function scoreRow(row, model) {
    const x = model.features.map(name => Number(row[name]));
    if (x.some(v => !Number.isFinite(v))) throw new Error('Missing/non-numeric model feature in CSV row');
    const z = model.bias + model.weights.reduce((s,w,i)=>s+w*x[i],0);
    return sigmoid(z);
  }

  function confusion(rows, threshold) {
    let tp=0,tn=0,fp=0,fn=0;
    for (const r of rows) {
      const pred = r.score >= threshold ? 1 : 0;
      if (pred===1 && r.label===1) tp++;
      else if (pred===0 && r.label===0) tn++;
      else if (pred===1 && r.label===0) fp++;
      else fn++;
    }
    const safe=(a,b)=>b?a/b:0;
    return {tp,tn,fp,fn,
      sensitivity:safe(tp,tp+fn), specificity:safe(tn,tn+fp),
      ppv:safe(tp,tp+fp), npv:safe(tn,tn+fn),
      accuracy:safe(tp+tn,rows.length)};
  }

  function aucRoc(rows) {
    const pos=rows.filter(r=>r.label===1), neg=rows.filter(r=>r.label===0);
    if(!pos.length||!neg.length) return NaN;
    let wins=0,ties=0;
    for(const p of pos) for(const n of neg){ if(p.score>n.score)wins++; else if(p.score===n.score)ties++; }
    return (wins+0.5*ties)/(pos.length*neg.length);
  }

  function auprc(rows) {
    const sorted=[...rows].sort((a,b)=>b.score-a.score);
    const totalPos=sorted.reduce((s,r)=>s+r.label,0);
    if(!totalPos) return NaN;
    let tp=0,fp=0,prevRecall=0,area=0;
    for(const r of sorted){
      if(r.label===1) tp++; else fp++;
      const precision=tp/(tp+fp), recall=tp/totalPos;
      area += (recall-prevRecall)*precision;
      prevRecall=recall;
    }
    return area;
  }

  function calibration(rows, bins=10) {
    const out=[];
    for(let i=0;i<bins;i++){
      const lo=i/bins, hi=(i+1)/bins;
      const group=rows.filter(r=>r.score>=lo && (i===bins-1?r.score<=hi:r.score<hi));
      if(!group.length) continue;
      out.push({
        bin:`${Math.round(lo*100)}-${Math.round(hi*100)}%`,
        n:group.length,
        meanPredicted:group.reduce((s,r)=>s+r.score,0)/group.length,
        observedRate:group.reduce((s,r)=>s+r.label,0)/group.length
      });
    }
    return out;
  }

  function falseAlertsPerPatientWeek(rows, threshold) {
    const fp = rows.filter(r=>r.label===0 && r.score>=threshold).length;
    const weeks = rows.reduce((s,r)=>s+(Number(r.patient_weeks)||0),0);
    return weeks ? fp/weeks : NaN;
  }

  function leadTime(rows, threshold) {
    const vals = rows.filter(r=>r.label===1 && r.score>=threshold && Number.isFinite(Number(r.lead_time_days)))
      .map(r=>Number(r.lead_time_days)).sort((a,b)=>a-b);
    if(!vals.length) return {n:0,median:null,p25:null,p75:null};
    const q=p=>vals[Math.min(vals.length-1,Math.floor((vals.length-1)*p))];
    return {n:vals.length,median:q(.5),p25:q(.25),p75:q(.75)};
  }

  function parseCsv(text) {
    const lines=text.trim().split(/\r?\n/).filter(Boolean);
    const headers=lines.shift().split(',').map(s=>s.trim());
    return lines.map(line=>{
      const vals=line.split(',').map(s=>s.trim());
      return Object.fromEntries(headers.map((h,i)=>[h,vals[i]??'']));
    });
  }

  function evaluateCsv(text, model=window.BAZI_FROZEN_MODEL) {
    if(!model) throw new Error('Frozen model artifact not loaded');
    const raw=parseCsv(text);
    const rows=raw.map(r=>({...r,label:Number(r.label),score:clamp(scoreRow(r,model),0,1)}));
    if(rows.some(r=>![0,1].includes(r.label))) throw new Error('label must be 0 or 1');
    const threshold=Number(model.defaultThreshold);
    const cm=confusion(rows,threshold);
    return {
      model:{name:model.name,version:model.version,artifactClass:model.artifactClass,threshold},
      cohort:{rows:rows.length,participants:new Set(rows.map(r=>r.participant_id)).size,prevalence:rows.reduce((s,r)=>s+r.label,0)/rows.length},
      metrics:{auroc:aucRoc(rows),auprc:auprc(rows),...cm,falseAlertsPerPatientWeek:falseAlertsPerPatientWeek(rows,threshold),leadTime:leadTime(rows,threshold)},
      calibration:calibration(rows)
    };
  }

  window.BaziPilotValidation={parseCsv,evaluateCsv,aucRoc,auprc,calibration,confusion};
})();
