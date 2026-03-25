#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');
const args = parseArgs(process.argv.slice(2));

const batchId = args['batch-id'] ?? args.batchId;
const targetEnv = String(args['target-env'] ?? 'uat').toLowerCase();
const envFile = args['env-file'] ? resolve(repoRoot, args['env-file']) : null;
const artifactsDir = resolve(repoRoot, args['artifacts-dir'] ?? `docs/growthpilot/artifacts/${targetEnv}/${batchId ?? 'missing-batch-id'}`);
const reportFile = resolve(repoRoot, args['report-file'] ?? `${artifactsDir}/${batchId ?? 'missing-batch-id'}.release-report.md`);
const mode = detectMode(args);

if (!batchId) {
  fail('missing required --batch-id');
}

if (!['uat', 'prod'].includes(targetEnv)) {
  fail(`unsupported --target-env: ${targetEnv}`);
}

if (envFile && !existsSync(envFile)) {
  fail(`env file not found: ${envFile}`);
}

if (!args.csv && !args.json && !args.input) {
  fail('one of --csv, --json or --input is required');
}

const env = {
  ...process.env,
  ...(envFile ? loadEnvFile(envFile) : {}),
};

if (mode === 'db-apply') {
  if (targetEnv === 'prod' && !args['confirm-prod']) {
    fail('prod db apply requires --confirm-prod');
  }
  if (!env.DATABASE_URL && !args['db-url']) {
    fail('DATABASE_URL or --db-url is required for --db-apply');
  }
}

mkdirSync(artifactsDir, { recursive: true });

const childArgs = [
  resolve(repoRoot, 'scripts/migration/run-staging-import.mjs'),
  mode === 'db-apply' ? '--db-apply' : '--dry-run',
  '--batchId',
  batchId,
  '--artifacts-dir',
  relativeToRepo(artifactsDir),
];

for (const key of ['csv', 'json', 'input', 'sourceSystem', 'sourceFile', 'db-schema', 'db-url']) {
  const value = args[key];
  if (value == null || value === false) {
    continue;
  }
  childArgs.push(`--${key}`, String(value));
}

const result = spawnSync('node', childArgs, {
  cwd: repoRoot,
  env,
  encoding: 'utf8',
});

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.stderr.write(result.stdout);
  process.exit(result.status ?? 1);
}

const summary = parseJsonOutput(result.stdout);
const markdownReport = buildReleaseReport({ targetEnv, mode, summary });
writeFileSync(reportFile, markdownReport);

if (mode === 'report-only') {
  console.log(markdownReport);
} else {
  process.stdout.write(result.stdout);
  console.log(`\nrelease report written to ${reportFile}`);
}

function detectMode(parsedArgs) {
  const modes = ['dry-run', 'db-apply', 'report-only'].filter((key) => Boolean(parsedArgs[key]));
  if (modes.length !== 1) {
    fail('exactly one of --dry-run, --db-apply or --report-only is required');
  }
  return modes[0];
}

function buildReleaseReport({ targetEnv: envName, mode: selectedMode, summary }) {
  const rejectEntries = Object.entries(summary.rejectsByCode ?? {});
  const rejectLines = rejectEntries.length === 0
    ? '- 无 reject'
    : rejectEntries.map(([code, count]) => `- ${code}: ${count}`);

  const artifactLines = summary.artifacts
    ? [
        `- summary: \`${summary.artifacts.summaryJson}\``,
        `- raw: \`${summary.artifacts.rawNdjson}\``,
        `- normalized: \`${summary.artifacts.normalizedNdjson}\``,
        `- reject: \`${summary.artifacts.rejectReportCsv}\``,
        `- db-plan: \`${summary.artifacts.dbPlanSql}\``,
      ]
    : ['- 未生成 artifact'];

  return [
    `# Migration Release Report`,
    '',
    `- targetEnv: \`${envName}\``,
    `- batchId: \`${summary.batchId}\``,
    `- mode: \`${selectedMode}\``,
    `- sourceFile: \`${summary.sourceFile}\``,
    `- sourceSystem: \`${summary.sourceSystem}\``,
    '',
    '## Summary',
    '',
    `- rawRows: \`${summary.plan?.rawRows ?? 0}\``,
    `- normalizedRows: \`${summary.plan?.normalizedRows ?? 0}\``,
    `- readyToLoadRows: \`${summary.plan?.readyToLoadRows ?? 0}\``,
    `- rejectedRows: \`${summary.plan?.rejectedRows ?? 0}\``,
    '',
    '## Ready Domains',
    '',
    ...Object.entries(summary.finalLoadPlan?.readyRowsByDomain ?? {}).map(([domain, count]) => `- ${domain}: ${count}`),
    '',
    '## Rejects',
    '',
    ...rejectLines,
    '',
    '## Artifacts',
    '',
    ...artifactLines,
    '',
    '## Notes',
    '',
    '- 当前仓库可将数据写入 `qa_staging.*` staging 表并生成校验产物；正式业务表全量落表不在本脚本范围内。',
    '- `--report-only` 仍会执行一次 dry-run 解析并写出 artifact，但不会写数据库。',
    '- 如目标环境为 prod，必须先完成 Go/No-Go、备份、回滚与负责人签字。',
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

function loadEnvFile(filePath) {
  const parsed = {};
  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    parsed[key] = value;
  }
  return parsed;
}

function parseJsonOutput(stdout) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    fail(`failed to parse migration summary JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function relativeToRepo(absolutePath) {
  if (!absolutePath.startsWith(repoRoot)) {
    return absolutePath;
  }
  return absolutePath.slice(repoRoot.length + 1);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
