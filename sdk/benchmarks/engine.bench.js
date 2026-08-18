import { performance } from 'node:perf_hooks';
import { BaziEngagementSDK } from '../src/index.js';

let current = 1_700_000_000_000;
const sdk = new BaziEngagementSDK({ clock: () => current });
sdk.startSession({ sessionId: 'benchmark' });
const samples = 10_000;
const start = performance.now();
for (let index = 0; index < samples; index += 1) {
  await sdk.ingest({
    timestamp: current++, kind: 'tap', taskType: 'cognitive', quality: 0.95,
    metrics: { latencyMs: 250 + (index % 200), pauseMs: index % 17 === 0 ? 1900 : 200, engagementScore: 80 - (index % 20), error: index % 13 === 0, fatigue: (index % 10) / 10 }
  }, { decide: false });
}
const ingestionMs = performance.now() - start;
const decisionStart = performance.now();
for (let index = 0; index < 1000; index += 1) await sdk.decide();
const decisionMs = performance.now() - decisionStart;
console.log(JSON.stringify({
  runtime: process.version,
  samples,
  ingestionMs,
  ingestionMicrosecondsPerSample: ingestionMs * 1000 / samples,
  decisions: 1000,
  decisionMs,
  decisionMicrosecondsPerCall: decisionMs * 1000 / 1000,
  rawRecordCountAfterRun: sdk.privacyStatus().rawRecordCount,
  heapUsedBytes: process.memoryUsage().heapUsed
}, null, 2));
