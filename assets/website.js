import { Workspace } from '../packages/engagement/workspace.js';
import { MODEL } from '../packages/engagement/model.js';
import { explainPatient } from '../packages/engagement/interpretation.js';

const workspace=new Workspace();
const patient=workspace.patient('BZ-001');
const events=patient.events.slice(0,24);
const explanation=explainPatient(patient,events,MODEL.defaultThreshold);
const result=explanation.result;
const setText=(id,value)=>{const element=document.getElementById(id);if(element)element.textContent=value;};
const signed=value=>(value>0?'+':'')+Math.round(value);
const warning=explanation.warning?.leadDays;

setText('hero-warning',warning===undefined?'—':warning.toFixed(0));
setText('hero-review-state',result.band==='elevated'?'Review required':'Monitoring');
setText('preview-warning',warning===undefined?'—':warning.toFixed(0));
setText('preview-events',events.length);
setText('pattern-event-count',events.length);
setText('preview-score',result.score.toFixed(3));
setText('preview-band',result.band==='elevated'?'Elevated · review required':result.band==='watch'?'Watch the pattern':'Continue monitoring');
setText('story-explanation',explanation.narrative);
setText('cohort-count',workspace.cohort.length.toLocaleString('en-US'));
setText('event-count',workspace.cohort.reduce((sum,p)=>sum+p.events.length,0).toLocaleString('en-US'));

function sparkline({pattern=false}={}) {
  const width=pattern?390:230,height=pattern?190:62,left=pattern?0:3,right=pattern?390:227;
  const x=day=>left+day/events.at(-1).day*(right-left);
  const engagementY=value=>(height-8)-(value/100)*(height-18);
  const signalY=value=>(height-8)-value*(height-18);
  const points=(items,y)=>items.map(([day,value])=>x(day).toFixed(1)+','+y(value).toFixed(1)).join(' ');
  const observed=events.map(e=>[e.day,e.engagement]);
  const signal=explanation.history.filter(v=>v.result.available).map(v=>[v.day,v.result.score]);
  return '<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Observed synthetic engagement and reference model signal across Maya’s first 24 events">'+
    (pattern?[25,50,75].map(value=>'<line x1="0" x2="'+width+'" y1="'+engagementY(value)+'" y2="'+engagementY(value)+'" stroke="#f7f0db" stroke-opacity=".12"/>').join(''):'')+
    '<polyline points="'+points(observed,engagementY)+'" fill="none" stroke="'+(pattern?'#edead1':'#788f63')+'" stroke-width="'+(pattern?'2.8':'1.8')+'" stroke-linejoin="round"/>'+
    '<polyline points="'+points(signal,signalY)+'" fill="none" stroke="'+(pattern?'#d5c396':'#b8a065')+'" stroke-width="'+(pattern?'2':'1.3')+'" stroke-dasharray="4 5" stroke-linejoin="round"/>'+
    (pattern?events.filter((_,i)=>i%3===0).map(e=>'<circle cx="'+x(e.day)+'" cy="'+engagementY(e.engagement)+'" r="3" fill="#65735b" stroke="#edead1" stroke-width="1.4"/>').join(''):'')+'</svg>';
}
document.getElementById('hero-sparkline').innerHTML=sparkline();
document.getElementById('pattern-chart').innerHTML=sparkline({pattern:true});

function trajectory() {
  const x=day=>36+day/84*540,engagementY=value=>192-value*1.5,signalY=value=>192-value*150;
  const line=(items,y)=>items.map(([day,value])=>x(day).toFixed(1)+','+y(value).toFixed(1)).join(' ');
  const observed=events.map(e=>[e.day,e.engagement]);
  const future=patient.events.slice(events.length-1).map(e=>[e.day,e.engagement]);
  const scores=explanation.history.filter(v=>v.result.available).map(v=>[v.day,v.result.score]);
  const w=explanation.warning;
  let svg='<svg viewBox="0 0 600 227" role="img" aria-label="Maya’s 12-week synthetic journey: observed engagement, computed signal, and the retrospective warning window. Dashed gray events are unobserved and excluded from current scoring.">';
  svg+=[0,50,100].map(value=>'<line x1="36" x2="578" y1="'+engagementY(value)+'" y2="'+engagementY(value)+'" stroke="#e9edde"/><text x="7" y="'+(engagementY(value)+3)+'" fill="#879779" font-size="8" font-family="Arial">'+value+'</text>').join('');
  svg+=[0,.5,1].map(value=>'<text x="582" y="'+(signalY(value)+3)+'" fill="#a18752" font-size="8" font-family="Arial">'+value.toFixed(1)+'</text>').join('');
  if(w)svg+='<rect x="'+x(w.detectedDay)+'" y="35" width="'+(x(w.endpointDay)-x(w.detectedDay))+'" height="157" fill="#f0e3c0"/><path d="M'+x(w.detectedDay)+',26 v-7 H'+x(w.endpointDay)+' v7" fill="none" stroke="#b19b65"/><text x="'+(x(w.detectedDay)-27)+'" y="11" fill="#8d7b49" font-size="8" font-family="Arial">'+w.leadDays.toFixed(0)+'-day warning window</text>';
  svg+='<line x1="36" x2="578" y1="'+signalY(MODEL.defaultThreshold)+'" y2="'+signalY(MODEL.defaultThreshold)+'" stroke="#bfa970" stroke-opacity=".42" stroke-dasharray="3 5"/>';
  svg+='<polyline points="'+line(future,engagementY)+'" fill="none" stroke="#b9c0b0" stroke-width="1.7" stroke-dasharray="3 5"/>';
  svg+='<polyline points="'+line(observed,engagementY)+'" fill="none" stroke="#577a57" stroke-width="2.5" stroke-linejoin="round"/>';
  svg+='<polyline points="'+line(scores,signalY)+'" fill="none" stroke="#b99c5e" stroke-width="1.7" stroke-dasharray="4 4" stroke-linejoin="round"/>';
  svg+=events.filter((_,i)=>i%3===0).map(e=>'<circle cx="'+x(e.day)+'" cy="'+engagementY(e.engagement)+'" r="2.5" fill="#fffdf7" stroke="#577a57" stroke-width="1.3"/>').join('');
  if(explanation.alert){const a=explanation.alert;svg+='<path d="M'+x(a.day)+','+(signalY(a.result.score)-5)+' l5,5 -5,5 -5,-5 z" fill="#b99c5e"><title>First observed review threshold crossing</title></path>';}
  svg+=[[0,'Week 1'],[21,'Week 4'],[49,'Week 8'],[77,'Week 12']].map(([day,label])=>'<text x="'+(x(day)-9)+'" y="216" fill="#879779" font-size="8" font-family="Arial">'+label+'</text>').join('');
  svg+='<text x="7" y="29" fill="#577a57" font-size="8" font-family="Arial">Engagement index</text><text x="520" y="29" fill="#a18752" font-size="8" font-family="Arial">Model signal</text>';
  return svg+'</svg>';
}
document.getElementById('preview-chart').innerHTML=trajectory();
document.getElementById('story-evidence').innerHTML=[
  ['Session duration vs. baseline',signed(explanation.durationChange*100)+'%'],
  ['Recent missed sessions',String(explanation.missed)],
  ['Late sessions in the recent window',String(explanation.late)],
  ['Engagement vs. observed baseline',signed(explanation.engagementChange)+' points']
].map(([label,value])=>'<div class="evidence-row"><span>'+label+'</span><strong>'+value+'</strong></div>').join('');

const tabs=[...document.querySelectorAll('[data-story]')];
function selectStory(index,focus=false) {
  tabs.forEach((tab,i)=>{
    const selected=i===index;
    tab.classList.toggle('active',selected);
    tab.setAttribute('aria-selected',String(selected));
    tab.tabIndex=selected?0:-1;
    tab.querySelector('.tab-plus').textContent=selected?'−':'+';
    document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;
  });
  if(focus)tabs[index].focus();
}
tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>selectStory(index));
  tab.addEventListener('keydown',event=>{
    let next;
    if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(index+1)%tabs.length;
    else if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=tabs.length-1;
    if(next!==undefined){event.preventDefault();selectStory(next,true);}
  });
});

const menuButton=document.getElementById('site-menu-toggle');
const menu=document.getElementById('main-navigation');
function closeMenu({focus=false}={}) {
  menu.classList.remove('open');
  menuButton.setAttribute('aria-expanded','false');
  menuButton.setAttribute('aria-label','Open navigation');
  if(focus)menuButton.focus();
}
menuButton.addEventListener('click',()=>{
  const open=menu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded',String(open));
  menuButton.setAttribute('aria-label',open?'Close navigation':'Open navigation');
});
menu.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.classList.contains('open'))closeMenu({focus:true});});
document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenu();});
if('serviceWorker' in navigator)navigator.serviceWorker.register(new URL('../sw.js',import.meta.url)).catch(()=>{});
