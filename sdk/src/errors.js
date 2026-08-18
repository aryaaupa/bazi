export class BaziError extends Error {
  constructor(message, code = 'BAZI_ERROR', details = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends BaziError {
  constructor(message, details) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class ConfigurationError extends BaziError {
  constructor(message, details) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}

export class DecisionNotFoundError extends BaziError {
  constructor(decisionId) {
    super(`Decision not found: ${decisionId}`, 'DECISION_NOT_FOUND', { decisionId });
  }
}
