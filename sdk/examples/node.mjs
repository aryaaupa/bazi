import { BaziEngagementSDK, MemoryStorageAdapter } from '../src/index.js';

const sdk = new BaziEngagementSDK({
  storage: new MemoryStorageAdapter(),
  constraints: { allowedActionIds: ['no_action', 'encouragement', 'provider_review'] },
  executor: async (action, decision) => {
    console.log('Execute:', action.label, 'for', decision.sessionId);
    return { delivered: true };
  }
});

sdk.startSession({ sessionId: 'example-session' });

for (let index = 0; index < 8; index += 1) {
  await sdk.ingest({
    kind: index % 2 ? 'touch' : 'exercise_rep',
    taskType: 'cognitive',
    quality: 0.95,
    metrics: {
      latencyMs: 250 + index * 90,
      pauseMs: index > 4 ? 2200 : 250,
      cadence: 1.4 - index * 0.08,
      engagementScore: 90 - index * 6,
      error: index > 5,
      fatigue: index / 10
    }
  }, { decide: false });
}

const decision = await sdk.decide();
console.log(JSON.stringify(decision, null, 2));
console.log('Privacy:', sdk.privacyStatus());
