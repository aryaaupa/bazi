import { ConfigurationError } from './errors.js';
import { clamp, sigmoid } from './utils.js';
import { FEATURE_ORDER, featureVector } from './features.js';

const RESEARCH_WEIGHTS = {
  latencyDeviation: 0.55,
  pauseRate: 1.15,
  cadenceDrift: 0.75,
  motionVariance: 0.35,
  smoothnessDrop: 0.6,
  engagementSlope: 0.9,
  errorRate: 1.1,
  fatigue: 0.8,
  monotony: 0.35,
  missingRate: 0.9
};

export class LogisticRiskModel {
  constructor({ weights = RESEARCH_WEIGHTS, bias = -1.4, version = 'bazi-research-default-v1', validated = false } = {}) {
    for (const feature of FEATURE_ORDER) {
      if (!Number.isFinite(weights[feature])) throw new ConfigurationError(`Missing finite risk weight for ${feature}`);
    }
    this.weights = { ...weights };
    this.bias = bias;
    this.version = version;
    this.validated = validated;
  }

  predict(features) {
    const vector = featureVector(features);
    const linear = vector.reduce((sum, value, index) => sum + value * this.weights[FEATURE_ORDER[index]], this.bias);
    const probability = clamp(sigmoid(linear), 0.001, 0.999);
    const entropy = -(probability * Math.log(probability) + (1 - probability) * Math.log(1 - probability)) / Math.log(2);
    const coveragePenalty = clamp(1 - (features.coverage ?? 0), 0, 1);
    const uncertainty = clamp(0.65 * entropy + 0.35 * coveragePenalty, 0, 1);
    return {
      probability,
      uncertainty,
      linear,
      version: this.version,
      validated: this.validated,
      contributions: FEATURE_ORDER.map((name, index) => ({ name, value: vector[index], contribution: vector[index] * this.weights[name] }))
        .sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution))
    };
  }
}
