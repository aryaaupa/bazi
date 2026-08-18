import { clamp } from './utils.js';

export class EligibilityManager {
  constructor({
    baseThreshold = 0.62,
    fatigueWeight = 0.08,
    monotonyWeight = 0.05,
    uncertaintyWeight = 0.14,
    burdenWeight = 0.12,
    minThreshold = 0.35,
    maxThreshold = 0.9,
    cooldownMs = 30_000,
    maxInterventionsPerSession = 8
  } = {}) {
    Object.assign(this, { baseThreshold, fatigueWeight, monotonyWeight, uncertaintyWeight, burdenWeight, minThreshold, maxThreshold, cooldownMs, maxInterventionsPerSession });
  }

  evaluate({ probability, uncertainty, features, burden, lastInterventionAt, interventionCount, now, protocolEnabled = true }) {
    const threshold = clamp(
      this.baseThreshold - this.fatigueWeight * features.fatigue - this.monotonyWeight * features.monotony
      + this.uncertaintyWeight * uncertainty + this.burdenWeight * burden,
      this.minThreshold,
      this.maxThreshold
    );
    const reasons = [];
    if (!features.sensorValid) reasons.push('sensor_invalid');
    if (!protocolEnabled) reasons.push('protocol_disabled');
    if (lastInterventionAt != null && now - lastInterventionAt < this.cooldownMs) reasons.push('cooldown_active');
    if (interventionCount >= this.maxInterventionsPerSession) reasons.push('session_budget_exhausted');
    if (probability < threshold) reasons.push('risk_below_threshold');
    return { eligible: reasons.length === 0, threshold, reasons };
  }
}
