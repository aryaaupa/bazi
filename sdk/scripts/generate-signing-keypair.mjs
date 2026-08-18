import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const prefix = process.argv[2] ?? 'bazi-signing';
const pair = await globalThis.crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const privateJwk = await globalThis.crypto.subtle.exportKey('jwk', pair.privateKey);
const publicJwk = await globalThis.crypto.subtle.exportKey('jwk', pair.publicKey);
await writeFile(resolve(`${prefix}.private.jwk.json`), `${JSON.stringify(privateJwk, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
await writeFile(resolve(`${prefix}.public.jwk.json`), `${JSON.stringify(publicJwk, null, 2)}\n`, 'utf8');
process.stdout.write(`Created ${prefix}.private.jwk.json and ${prefix}.public.jwk.json\n`);
