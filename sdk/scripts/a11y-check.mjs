import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(process.argv[2] ?? 'examples/browser.html');
const html = await readFile(path, 'utf8');
const checks = [
  ['document language', /<html[^>]+lang="[^"]+"/i],
  ['viewport metadata', /name="viewport"/i],
  ['unique main landmark', (value) => (value.match(/<main(?:\s|>)/gi) ?? []).length === 1],
  ['level-one heading', /<h1(?:\s|>)/i],
  ['button type', /<button[^>]+type="button"/i],
  ['button accessible name', /<button[^>]*>\s*[^<\s]/i],
  ['focus-visible treatment', /:focus-visible/i],
  ['44px target size', /min-(?:width|height):\s*44px/i],
  ['live status region', /aria-live="polite"/i],
  ['reduced-motion handling', /prefers-reduced-motion/i]
];
const results = checks.map(([name, rule]) => ({ name, pass: typeof rule === 'function' ? rule(html) : rule.test(html) }));
const failures = results.filter((result) => !result.pass);
process.stdout.write(`${JSON.stringify({ standardTarget: 'WCAG 2.2 AA smoke checks', file: path, results, pass: failures.length === 0 }, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
