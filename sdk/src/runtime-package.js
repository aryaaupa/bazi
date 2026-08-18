import { BaziEngagementSDK } from './engine.js';
import { ConfigurationError } from './errors.js';
import { FrozenActionManifest } from './manifest.js';
import { LogisticRiskModel } from './risk.js';

export async function createVerifiedBaziSDK({ signedPackage, verifier, runtimeOptions = {} }) {
  if (!verifier?.verify) throw new ConfigurationError('A SignedPackageVerifier is required');
  const payload = await verifier.verify(signedPackage);
  if (payload.kind !== 'bazi-runtime-package' || !payload.version || !payload.model || !payload.config || !payload.actionManifest) {
    throw new ConfigurationError('Signed runtime package is incomplete');
  }
  if (payload.model.validated !== true) throw new ConfigurationError('Signed runtime package must contain a validated model');
  const actionManifest = new FrozenActionManifest(payload.actionManifest);
  const riskModel = new LogisticRiskModel(payload.model);
  return new BaziEngagementSDK({
    ...payload.config,
    ...runtimeOptions,
    actionManifest,
    riskModel,
    requireValidatedModel: true,
    runtimePackageVersion: payload.version
  });
}
