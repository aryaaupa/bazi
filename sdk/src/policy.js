import { addOuterProduct, dot, identity, invert, matrixVector } from './utils.js';

export class LinUCBPolicy {
  #state = new Map();
  constructor({ dimensions, alpha = 0.35, ridge = 1 } = {}) {
    this.dimensions = dimensions;
    this.alpha = alpha;
    this.ridge = ridge;
  }

  choose(actions, contextVector, { allowExploration = true } = {}) {
    const scored = actions.map((action) => {
      const state = this.#for(action.id);
      const inverseA = invert(state.A);
      const theta = matrixVector(inverseA, state.b);
      const expected = dot(theta, contextVector);
      const variance = Math.max(dot(contextVector, matrixVector(inverseA, contextVector)), 0);
      const exploration = allowExploration && action.safeForExploration ? this.alpha * Math.sqrt(variance) : 0;
      const priorScore = action.priorScore ?? 0;
      const score = expected + exploration + priorScore - action.burden;
      return { action, score, expected, exploration, priorScore, burdenPenalty: action.burden };
    }).sort((left, right) => right.score - left.score || left.action.id.localeCompare(right.action.id));
    return { selected: scored[0]?.action, scored };
  }

  update(actionId, contextVector, reward) {
    const state = this.#for(actionId);
    state.A = addOuterProduct(state.A, contextVector);
    state.b = state.b.map((value, index) => value + reward * contextVector[index]);
    state.updates += 1;
  }

  exportState() { return Object.fromEntries([...this.#state.entries()].map(([id, state]) => [id, state])); }
  importState(state = {}) { this.#state = new Map(Object.entries(state)); }
  #for(actionId) {
    if (!this.#state.has(actionId)) this.#state.set(actionId, { A: identity(this.dimensions, this.ridge), b: Array(this.dimensions).fill(0), updates: 0 });
    return this.#state.get(actionId);
  }
}
