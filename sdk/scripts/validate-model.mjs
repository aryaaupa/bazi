import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { evaluatePredictions, participantBootstrap, subgroupReport, validateHeldOutRows } from '../src/index.js';

const args = parseArgs(process.argv.slice(2));
if (!args.input) fail('Usage: npm run validate:model -- --input predictions.json[|.jsonl] [--output report.json] [--threshold 0.5] [--subgroup field] [--iterations 2000]');
const rows = await readRows(resolve(args.input));
validateHeldOutRows(rows);
const labeled = rows.filter((row) => row.label === 0 || row.label === 1);
const threshold = numberArg(args.threshold, 0.5);
const iterations = numberArg(args.iterations, 2000);
const report = {
  generatedAt: new Date().toISOString(),
  evidenceClass: 'held-out-participant-validation',
  data: {
    rows: rows.length,
    labeledRows: labeled.length,
    censoredRows: rows.length - labeled.length,
    participants: new Set(rows.map((row) => row.participantId)).size,
    split: 'held_out'
  },
  outcomeDefinitionRequired: true,
  pointEstimates: evaluatePredictions(labeled, { threshold }),
  participantBootstrapConfidenceIntervals: participantBootstrap(labeled, { threshold, iterations }),
  subgroups: args.subgroup ? subgroupReport(labeled, args.subgroup, { threshold }) : null,
  interpretation: 'Statistical output only. Clinical acceptability and subgroup thresholds require a prespecified protocol and independent review.'
};
const output = `${JSON.stringify(report, null, 2)}\n`;
if (args.output) await writeFile(resolve(args.output), output, 'utf8');
else process.stdout.write(output);

async function readRows(path) {
  const text = await readFile(path, 'utf8');
  if (path.endsWith('.jsonl')) return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : parsed.rows;
}
function parseArgs(values) { const out = {}; for (let i = 0; i < values.length; i += 1) { const key = values[i]; if (!key.startsWith('--')) continue; out[key.slice(2)] = values[i + 1] && !values[i + 1].startsWith('--') ? values[++i] : true; } return out; }
function numberArg(value, fallback) { const parsed = value == null ? fallback : Number(value); if (!Number.isFinite(parsed)) fail(`Invalid numeric argument: ${value}`); return parsed; }
function fail(message) { process.stderr.write(`${message}\n`); process.exit(1); }
