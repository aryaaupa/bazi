import { writeFile } from 'node:fs/promises';
import { cpus, freemem, platform, release, totalmem } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { BaziEngagementSDK } from '../src/index.js';

const args = parseArgs(process.argv.slice(2));
const samples = numberArg(args.samples, 5000);
const decisions = numberArg(args.decisions, 500);
let current = 1_700_000_000_000;
const sdk = new BaziEngagementSDK({ clock: () => current, maxDecisionRecords: Math.max(decisions, 500) });
sdk.startSession({ sessionId: 'device-profile' });

for (let index = 0; index < 500; index += 1) await ingest(index);
const heapBefore = process.memoryUsage().heapUsed;
const cpuBefore = process.cpuUsage();
const ingestionLatencies = [];
let peakHeap = heapBefore;
for (let index = 0; index < samples; index += 1) {
  const start = performance.now();
  await ingest(index);
  ingestionLatencies.push(performance.now() - start);
  if (index % 100 === 0) peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
}
const decisionLatencies = [];
for (let index = 0; index < decisions; index += 1) {
  const start = performance.now();
  await sdk.decide();
  decisionLatencies.push(performance.now() - start);
  if (index % 25 === 0) peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
}
const cpu = process.cpuUsage(cpuBefore);
peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
const energyMWh = args['energy-mwh'] == null ? null : numberArg(args['energy-mwh'], null);
const operations = samples + decisions;
const report = {
  generatedAt: new Date().toISOString(),
  evidenceScope: args['device-name'] ? 'named-device-run' : 'reference-container-run',
  device: {
    name: args['device-name'] ?? 'unidentified CI/container host',
    platform: platform(), release: release(), architecture: process.arch,
    cpuModel: cpus()[0]?.model ?? 'unknown', logicalCpus: cpus().length,
    totalMemoryBytes: totalmem(), freeMemoryBytesAtStart: freemem(), runtime: process.version
  },
  workload: { warmupSamples: 500, measuredSamples: samples, measuredDecisions: decisions },
  latencyMs: { ingest: summarize(ingestionLatencies), decide: summarize(decisionLatencies) },
  memory: { heapBeforeBytes: heapBefore, heapAfterBytes: process.memoryUsage().heapUsed, observedPeakHeapBytes: peakHeap },
  cpuMicroseconds: { user: cpu.user, system: cpu.system, perMeasuredOperation: (cpu.user + cpu.system) / operations },
  energy: energyMWh == null
    ? { status: 'not_measured', reason: 'Supply --energy-mwh from an external device power measurement.' }
    : { status: 'measured_external_input', totalMWh: energyMWh, microWhPerMeasuredOperation: energyMWh * 1000 / operations },
  privacy: sdk.privacyStatus(),
  limitations: ['This is a software workload profile, not clinical validation.', 'A reference-container run does not substitute for every supported endpoint model and OS version.']
};
const output = `${JSON.stringify(report, null, 2)}\n`;
if (args.output) await writeFile(resolve(args.output), output, 'utf8');
else process.stdout.write(output);

async function ingest(index) {
  await sdk.ingest({ timestamp: current++, kind: 'tap', taskType: 'cognitive', quality: 0.95, metrics: {
    latencyMs: 250 + (index % 200), pauseMs: index % 17 === 0 ? 1900 : 200,
    engagementScore: 80 - (index % 20), error: index % 13 === 0, fatigue: (index % 10) / 10
  } }, { decide: false });
}
function summarize(values) { const sorted = [...values].sort((a, b) => a - b); return { mean: values.reduce((sum, value) => sum + value, 0) / values.length, p50: quantile(sorted, 0.5), p95: quantile(sorted, 0.95), p99: quantile(sorted, 0.99), max: sorted.at(-1) }; }
function quantile(sorted, q) { const position = (sorted.length - 1) * q; const base = Math.floor(position); const rest = position - base; return sorted[base + 1] == null ? sorted[base] : sorted[base] + rest * (sorted[base + 1] - sorted[base]); }
function parseArgs(values) { const out = {}; for (let i = 0; i < values.length; i += 1) { if (!values[i].startsWith('--')) continue; out[values[i].slice(2)] = values[i + 1] && !values[i + 1].startsWith('--') ? values[++i] : true; } return out; }
function numberArg(value, fallback) { const result = value == null ? fallback : Number(value); if (!Number.isFinite(result) || result <= 0) throw new Error(`Expected a positive number, received ${value}`); return result; }
