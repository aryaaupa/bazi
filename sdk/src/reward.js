import { clamp } from './utils.js';

export class RewardEvaluator {
  constructor({ recoveryWeight = 0.45, completionWeight = 0.35, abandonmentPenalty = 0.55, dismissalPenalty = 0.15, burdenWeight = 0.2 } = {}) {
    Object.assign(this, { recoveryWeight, completionWeight, abandonmentPenalty, dismissalPenalty, burdenWeight });
  }

  evaluate(outcome, action) {
    const reasons = [];
    if (!outcome || outcome.observationComplete !== true) reasons.push('observation_incomplete');
    if (outcome?.sensorValid === false) reasons.push('sensor_invalid');
    if (outcome?.confounded === true) reasons.push('confounded_outcome');
    if (reasons.length) return { valid: false, censored: true, reward: null, reasons };
    const recovery = clamp(Number(outcome.recoveryDelta ?? 0), -1, 1);
    const completion = outcome.completed ? 1 : 0;
    const abandonment = outcome.abandoned ? 1 : 0;
    const dismissed = outcome.dismissed ? 1 : 0;
    const raw = this.recoveryWeight * recovery + this.completionWeight * completion
      - this.abandonmentPenalty * abandonment - this.dismissalPenalty * dismissed
      - this.burdenWeight * (action?.burden ?? 0);
    return { valid: true, censored: false, reward: clamp(raw, -1, 1), reasons: [] };
  }
}
