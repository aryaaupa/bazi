import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['src', 'scripts', 'benchmarks'];
const codeFiles = [];
for (const root of roots) await collect(resolve(root), codeFiles, new Set(['.js', '.mjs']));
for (const file of codeFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(result.status ?? 1); }
}
const jsonFiles = [];
for (const root of ['schemas', 'config']) await collect(resolve(root), jsonFiles, new Set(['.json']));
for (const file of jsonFiles) JSON.parse(await readFile(file, 'utf8'));
process.stdout.write(`Syntax checked ${codeFiles.length} JavaScript files and parsed ${jsonFiles.length} JSON files.\n`);

async function collect(path, output, extensions) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const item = join(path, entry.name);
    if (entry.isDirectory()) await collect(item, output, extensions);
    else if (extensions.has(extname(entry.name))) output.push(item);
  }
}
