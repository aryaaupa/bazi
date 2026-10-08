import {Workspace,ACTIONS} from '../packages/engagement/workspace.js';
import {rehabSummary,rehabEvent,REHAB_STATUS} from '../packages/engagement/rehab-demo.js';
const storage=(()=>{try{return localStorage}catch{return null}})();
const workspace=new Workspace({storage});
const $=id=>document.getElementById(id);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const patientId='BZ-001';
let feedback='';
const friendlyStatus=REHAB_STATUS;
function render(){
 const patient=workspace.patient(patientId),events=workspace.events(patientId),summary=rehabSummary(events),recent=events.slice(-5),last=events.at(-1);
 const approved=workspace.state.decisions.filter(d=>d.patientId===patientId&&d.status==='approved').at(-1);
 const action=approved?ACTIONS.find(a=>a.id===approved.actionId):null;
 $('patient-app').innerHTML=`<div class="intro"><div class="eyebrow">Home exercise companion · synthetic demo</div><h1>Welcome back, ${escapeHtml(patient.name.split(' ')[0])}.</h1><p>Record home exercise participation and see your activity history. You're in control of what you record in this demonstration.</p></div>
 <div class="grid"><section class="card"><div class="eyebrow">Home exercise participation</div><div class="stat">${summary.participationRate===null?"—":Math.round(summary.participationRate*100)+"%"}</div><p>Descriptive participation: completed, late or partial sessions divided by observed sessions. Not a clinical outcome.</p><p class="muted">${summary.total} observed sessions · ${summary.skipped} skipped · latest ${last?new Date(last.occurred_at).toLocaleDateString():'none'}</p></section>
 <section class="card"><h2>Support from your care team</h2>${action?`<div class="message"><strong>${escapeHtml(action.label)}</strong><p>${escapeHtml(action.purpose)}</p><small>Clinician-approved synthetic workflow. No message was sent.</small></div>`:'<p>No approved support message is currently recorded. Your care team retains control over engagement-support decisions.</p>'}</section>
 <section class="card wide"><h2>How did your home exercise session go?</h2><p>Record a simulated home exercise session. This will update the shared synthetic record visible in the clinician workspace.</p><form id="activity-form">
 <label for="status">Participation</label><select id="status" name="status"><option value="completed">I completed my exercises</option><option value="shortened">I did some exercises</option><option value="late">I exercised later than planned</option><option value="skipped">I couldn't do my exercises</option></select>
 <label for="duration">Minutes of exercise</label><input id="duration" name="duration" type="number" min="0" max="180" value="20" required>
 <label for="engagement">How manageable did the session feel? <output id="engagement-value">70</output>/100</label><input id="engagement" name="engagement" type="range" min="0" max="100" value="70">
 <label for="fatigue">Fatigue during exercise</label><select id="fatigue" name="fatigue"><option value="low">Feeling good</option><option value="medium">A little tired</option><option value="high">Very tired</option></select>
 <label for="difficulty">Exercise difficulty</label></label><select id="difficulty" name="difficulty"><option value="appropriate">About right</option><option value="too-easy">Too easy</option><option value="too-hard">Too difficult</option></select>
 <div class="actions"><button type="submit">Save my activity</button><a class="secondary" href="../app/#patient/BZ-001" style="align-self:center">View clinician evidence ↗</a></div></form>${feedback?`<p class="feedback" role="status">${escapeHtml(feedback)}</p>`:''}</section>
 <section class="card wide"><h2>Recent activity</h2>${recent.slice().reverse().map(e=>`<div class="activity"><span>${escapeHtml(friendlyStatus[e.status]??e.status)}</span><span class="muted">${new Date(e.occurred_at).toLocaleDateString()} · ${Number(e.duration_minutes)} min</span></div>`).join('')}<p class="notice">This is a simulated experience, not a treatment app. No actual patient communication occurs.</p></section></div>`;
 $('engagement').addEventListener('input',event=>$('engagement-value').value=event.target.value);
 $('activity-form').addEventListener('submit',saveActivity);
}
async function saveActivity(event){
 event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;
 try{
 const values=Object.fromEntries(new FormData(form)),events=workspace.events(patientId),last=events.at(-1);
 const next=new Date(Math.max(Date.now(),Date.parse(last?.occurred_at??0)+60000)).toISOString();
 await workspace.ingestBatch([rehabEvent(values,next,patientId)]);
 feedback='Home exercise session saved to this browser’s synthetic record. Open the clinician workspace to inspect it.';render();
 }catch(error){feedback='Could not save activity: '+error.message;render();}
}
window.addEventListener('storage',event=>{if(event.key==='bazi-connected-workspace-v1')window.location.reload();});
workspace.initialize().then(render).catch(error=>{$('patient-app').textContent='Unable to open synthetic experience: '+error.message;});
