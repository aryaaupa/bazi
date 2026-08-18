import { ConfigurationError, ValidationError } from './errors.js';
import { deepCopy, nowIso, stableId } from './utils.js';

const subtle = globalThis.crypto?.subtle;

export class HostAuthorizer {
  constructor({ verifyPrincipal, rolePermissions }) {
    if (typeof verifyPrincipal !== 'function') throw new ConfigurationError('HostAuthorizer requires verifyPrincipal');
    this.verifyPrincipal = verifyPrincipal;
    this.rolePermissions = rolePermissions ?? {};
  }
  async authorize(credential, permission) {
    const principal = await this.verifyPrincipal(credential);
    if (!principal?.id || !Array.isArray(principal.roles)) throw new ValidationError('Host verifier did not return a valid principal');
    const allowed = principal.roles.some((role) => (this.rolePermissions[role] ?? []).includes(permission));
    if (!allowed) throw new ValidationError(`Principal lacks permission: ${permission}`);
    return { id: principal.id, roles: [...principal.roles] };
  }
}

export class IncidentLog {
  #entries = [];
  #sequence = 0;
  constructor({ clock = Date.now, sink = null } = {}) { this.clock = clock; this.sink = sink; }
  record({ severity, category, summary, component, metadata = {} }) {
    if (!['low', 'medium', 'high', 'critical'].includes(severity)) throw new ValidationError('Invalid incident severity');
    const entry = { id: stableId('INC', this.clock, ++this.#sequence), at: nowIso(this.clock), severity, category, summary, component, metadata: deepCopy(metadata) };
    this.#entries.push(entry); this.sink?.(deepCopy(entry)); return deepCopy(entry);
  }
  list() { return deepCopy(this.#entries); }
  clear() { this.#entries = []; }
}

export class EncryptedStorageAdapter {
  constructor(inner, key, { keyId = 'platform-managed-key' } = {}) { if (!subtle) throw new ConfigurationError('WebCrypto is unavailable'); this.inner = inner; this.key = key; this.keyId = keyId; this.securityProfile = 'AES-256-GCM'; }
  async get(key) {
    const envelope = await this.inner.get(key);
    if (!envelope) return null;
    if (envelope.version !== 1 || envelope.algorithm !== 'AES-GCM' || envelope.keyId !== this.keyId || typeof envelope.iv !== 'string' || typeof envelope.ciphertext !== 'string') {
      throw new ValidationError('Encrypted storage envelope is invalid or uses an untrusted key ID');
    }
    const plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv), additionalData: new TextEncoder().encode(key) }, this.key, fromBase64(envelope.ciphertext));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  async set(key, value) {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(key) }, this.key, new TextEncoder().encode(JSON.stringify(value)));
    await this.inner.set(key, { version: 1, algorithm: 'AES-GCM', keyId: this.keyId, iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) });
  }
  async delete(key) { await this.inner.delete(key); }
  static async generateKey() { if (!subtle) throw new ConfigurationError('WebCrypto is unavailable'); return subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
}

export class SignedPackageVerifier {
  constructor(publicKey, { isVersionAllowed = () => true, keyId = null } = {}) { if (!subtle) throw new ConfigurationError('WebCrypto is unavailable'); this.publicKey = publicKey; this.isVersionAllowed = isVersionAllowed; this.keyId = keyId; }
  async verify({ payload, signature, algorithm, keyId }) {
    if (algorithm && algorithm !== 'Ed25519') throw new ValidationError('Signed package algorithm must be Ed25519');
    if (this.keyId && keyId !== this.keyId) throw new ValidationError('Signed package key ID is not trusted');
    const data = new TextEncoder().encode(canonicalJson(payload));
    const valid = await subtle.verify({ name: 'Ed25519' }, this.publicKey, fromBase64(signature), data);
    if (!valid) throw new ValidationError('Signed package verification failed');
    if (!this.isVersionAllowed(payload?.version)) throw new ValidationError('Signed package version is revoked or older than the allowed release');
    return deepCopy(payload);
  }
}

export class SignedPackageSigner {
  constructor(privateKey, { keyId = 'offline-release-key' } = {}) { if (!subtle) throw new ConfigurationError('WebCrypto is unavailable'); this.privateKey = privateKey; this.keyId = keyId; }
  async sign(payload) {
    const data = new TextEncoder().encode(canonicalJson(payload));
    const signature = await subtle.sign({ name: 'Ed25519' }, this.privateKey, data);
    return { payload: deepCopy(payload), signature: toBase64(new Uint8Array(signature)), algorithm: 'Ed25519', keyId: this.keyId };
  }
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function toBase64(bytes) {
  if (globalThis.Buffer) return globalThis.Buffer.from(bytes).toString('base64');
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function fromBase64(value) {
  if (globalThis.Buffer) return new Uint8Array(globalThis.Buffer.from(value, 'base64'));
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
