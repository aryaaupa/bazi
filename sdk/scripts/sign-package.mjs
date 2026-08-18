import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SignedPackageSigner } from '../src/index.js';

const [payloadPath, privateKeyPath, outputPath] = process.argv.slice(2);
if (!payloadPath || !privateKeyPath || !outputPath) fail('Usage: node scripts/sign-package.mjs payload.json private.jwk.json signed-package.json');
const payload = JSON.parse(await readFile(resolve(payloadPath), 'utf8'));
const jwk = JSON.parse(await readFile(resolve(privateKeyPath), 'utf8'));
const key = await globalThis.crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['sign']);
const envelope = await new SignedPackageSigner(key).sign(payload);
await writeFile(resolve(outputPath), `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
process.stdout.write(`Signed ${outputPath}\n`);
function fail(message) { process.stderr.write(`${message}\n`); process.exit(1); }
