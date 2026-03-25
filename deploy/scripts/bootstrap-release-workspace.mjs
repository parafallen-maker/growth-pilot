#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');
const args = parseArgs(process.argv.slice(2));

const releaseId = sanitizeToken(args['release-id'] ?? args.releaseId);
const targetEnv = String(args['target-env'] ?? 'uat').toLowerCase();
const batchId = sanitizeToken(args['batch-id'] ?? args.batchId ?? `BATCH-${releaseId ?? 'missing-release-id'}`);
const outputDir = resolve(repoRoot, args['output-dir'] ?? `docs/growthpilot/artifacts/${targetEnv}/${releaseId ?? 'missing-release-id'}`);

if (!releaseId) {
  fail('missing required --release-id');
}

if (!['uat', 'prod'].includes(targetEnv)) {
  fail(`unsupported --target-env: ${targetEnv}`);
}

mkdirSync(outputDir, { recursive: true });

const templates = [
  {
    source: resolve(repoRoot, 'docs/growthpilot/templates/qa_release_gate_template.yaml'),
    target: resolve(outputDir, 'release-gate.yaml'),
  },
  {
    source: resolve(repoRoot, 'docs/growthpilot/templates/defect_triage_template.md'),
    target: resolve(outputDir, 'defect-triage.md'),
  },
  {
    source: resolve(repoRoot, 'docs/growthpilot/templates/uat_execution_template.yaml'),
    target: resolve(outputDir, 'uat-execution.yaml'),
  },
  {
    source: resolve(repoRoot, 'docs/growthpilot/templates/go_live_observation_log_template.md'),
    target: resolve(outputDir, 'go-live-observation.md'),
  },
  {
    source: resolve(repoRoot, 'docs/growthpilot/templates/release_acceptance_report_template.md'),
    target: resolve(outputDir, 'release-acceptance-report.md'),
  },
];

const writtenFiles = [];

for (const entry of templates) {
  const content = readFileSync(entry.source, 'utf8');
  const rendered = renderTemplate(content, {
    releaseId,
    targetEnv,
    batchId,
  });
  writeFileSync(entry.target, rendered);
  writtenFiles.push(entry.target);
}

const readmePath = resolve(outputDir, 'README.md');
writeFileSync(readmePath, buildReadme({ releaseId, targetEnv, batchId }));
writtenFiles.push(readmePath);

console.log(JSON.stringify({
  releaseId,
  targetEnv,
  batchId,
  outputDir,
  files: writtenFiles,
}, null, 2));

function renderTemplate(content, context) {
  return content
    .replaceAll('<release-id>', context.releaseId)
    .replaceAll('<target-env>', context.targetEnv)
    .replaceAll('<batch-id>', context.batchId)
    .replace(/^  environment: .+$/m, `  environment: ${context.targetEnv}`);
}

function buildReadme(context) {
  const envFile = context.targetEnv === 'prod' ? '.env.prod' : '.env.uat';
  const envMode = context.targetEnv === 'prod' ? 'prod' : 'uat';

  return [
    `# ${context.releaseId} Release Workspace`,
    '',
    `- targetEnv: \`${context.targetEnv}\``,
    `- batchId: \`${context.batchId}\``,
    '',
    '## Included Files',
    '',
    '- `release-gate.yaml`: Go/No-Go gate and signoff state',
    '- `defect-triage.md`: defect log and severity rubric',
    '- `uat-execution.yaml`: role-based UAT execution matrix',
    '- `go-live-observation.md`: 24h / 72h observation log',
    '- `release-acceptance-report.md`: final acceptance report shell',
    '',
    '## Recommended Commands',
    '',
    `\`\`\`bash`,
    `npm run ops:env:check -- --env-file ${envFile} --mode ${envMode}`,
    `npm run migration:release -- --dry-run --target-env ${context.targetEnv} --batch-id ${context.batchId} --csv scripts/migration/fixtures/staging-import-sample.csv`,
    `npm run migration:release -- --report-only --target-env ${context.targetEnv} --batch-id ${context.batchId} --csv scripts/migration/fixtures/staging-import-sample.csv`,
    '```',
    '',
    '## Usage Notes',
    '',
    '- Fill release owners, commit, signoff, and observed timestamps before execution.',
    '- Do not mark migration, deploy, or smoke checks complete until the real environment run is finished.',
    '- Save generated evidence in this directory so Go/No-Go review only needs one path.',
    '',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function sanitizeToken(value) {
  if (!value) {
    return '';
  }
  return String(value).trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
