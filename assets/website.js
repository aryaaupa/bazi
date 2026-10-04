import { Workspace } from '../packages/engagement/workspace.js';
import { assess, MODEL } from '../packages/engagement/model.js';

const workspace = new Workspace();
const patient = workspace.patient('BZ-001');
const events = patient.events.slice(0, 24);
const result = assess(patient, events);
const last = events.at(-1);
const percentage = value => Math.round(value * 100) + '%';
const setText = (id, text) => { document.getElementById(id).textContent = text; };

document.getElementById('preview-score').innerHTML = Math.round(result.score * 100) + '<small>/100</small>';
setText('preview-events', events.length);
setText('preview-engagement', last.engagement);
setText('preview-duration', last.duration_minutes.toFixed(1));
setText('preview-band', result.band === 'elevated' ? 'Needs provider review' : result.band === 'watch' ? 'Watch the pattern' : 'Continue monitoring');
setText('preview-duration-ratio', percentage(result.features.durationRatio));
setText('preview-missed', percentage(result.features.missedRate));

function trajectory(dark = false) {
  const start = events[0].day, end = last.day;
  const x = day => 30 + (day - start) / (end - start) * 470;
  const y = value => 181 - value * 1.48;
  const line = rows => rows.map(([day, value]) => x(day).toFixed(2) + ',' + y(value).toFixed(2)).join(' ');
  const observed = events.map(event => [event.day, event.engagement]);
  const signals = events.map((event, index) => ({ day: event.day, result: assess(patient, events.slice(0, index + 1)) })).filter(item => item.result.available);
  const grid = dark ? '#29443b' : '#e4eae4', label = dark ? '#97b6a3' : '#849588';
  const engagement = dark ? '#51df86' : '#228b51', risk = dark ? '#e4b26b' : '#c48a3b';
  let svg = '<svg viewBox="0 0 520 221" role="img" aria-label="Observed engagement and computed model signal for Leila’s first 24 synthetic sessions">';
  svg += [0, 25, 50, 75, 100].map(value => '<line x1="30" x2="500" y1="' + y(value) + '" y2="' + y(value) + '" stroke="' + grid + '"/><text x="3" y="' + (y(value) + 3) + '" fill="' + label + '" font-size="8" font-family="Arial">' + value + '</text>').join('');
  svg += '<polygon points="30,181 ' + line(observed) + ' 500,181" fill="' + (dark ? '#183e2d' : '#e8f5eb') + '"/>';
  svg += '<polyline points="' + line(observed) + '" fill="none" stroke="' + engagement + '" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>';
  svg += '<line x1="30" x2="500" y1="' + y(MODEL.defaultThreshold * 100) + '" y2="' + y(MODEL.defaultThreshold * 100) + '" stroke="' + risk + '" stroke-opacity=".4" stroke-dasharray="3 5"/>';
  svg += '<polyline points="' + line(signals.map(item => [item.day, item.result.score * 100])) + '" fill="none" stroke="' + risk + '" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round"/>';
  svg += '<circle cx="500" cy="' + y(last.engagement) + '" r="4" fill="' + engagement + '"/>';
  svg += '<circle cx="500" cy="' + y(result.score * 100) + '" r="4" fill="' + risk + '"/>';
  svg += [0, 1, 2, 3, 4].map(index => { const day = start + (end - start) * index / 4; return '<text x="' + (x(day) - (index === 4 ? 21 : 4)) + '" y="204" fill="' + label + '" font-size="8" font-family="Arial">Day ' + (Math.round(day) + 1) + '</text>'; }).join('');
  return svg + '</svg>';
}
document.getElementById('preview-chart').innerHTML = trajectory();
document.getElementById('story-chart').innerHTML = trajectory(true);
document.getElementById('story-evidence').innerHTML = [
  ['Session duration vs. baseline', result.features.durationRatio],
  ['Recent missed-session rate', result.features.missedRate],
  ['Reported high fatigue', result.features.fatigueHighRate]
].map(([label, value]) => '<div class="evidence-row"><span>' + label + '</span><strong>' + percentage(value) + '</strong><div class="evidence-bar"><span style="width:' + Math.min(100, Math.round(value * 100)) + '%"></span></div></div>').join('');
document.getElementById('cohort-pattern').innerHTML = '<span></span>'.repeat(workspace.cohort.length);

const tabs = [...document.querySelectorAll('[data-story]')];
function selectStory(index, focus = false) {
  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) tabs[index].focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectStory(index));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectStory(next, true); }
  });
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch(() => {});
