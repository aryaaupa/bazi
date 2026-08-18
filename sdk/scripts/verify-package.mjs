import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SignedPackageVerifier } from '../src/index.js';

const [packagePath, publicKeyPath] = process.argv.slice(2);
if (!packagePath || !publicKeyPath) fail('Usage: node scripts/verify-package.mjs signed-package.json public.jwk.json');
const envelope = JSON.parse(await readFile(resolve(packagePath), 'utf8'));
const jwk = JSON.parse(await readFile(resolve(publicKeyPath), 'utf8'));
const key = await globalThis.crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['verify']);
const payload = await new SignedPackageVerifier(key).verify(envelope);
process.stdout.write(`Verified ${payload.kind ?? 'package'} version ${payload.version ?? 'unknown'}\n`);
function fail(message) { process.stderr.write(`${message}\n`); process.exit(1); }
