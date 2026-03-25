#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Client } from 'pg';

const repoRoot = resolve(import.meta.dirname, '..', '..');
const runnerPath = resolve(repoRoot, 'scripts/migration/run-staging-import.mjs');
const sampleCsvPath = resolve(repoRoot, 'fixtures/staging-import-sample.csv');
const artifactDate = formatLocalDate(new Date());
const reportStem = 'qa-09-qa-11-local-postgres-validation';

const args = parseArgs(process.argv.slice(2));
const defaultArtifactsDir = resolve(repoRoot, `docs/growthpilot/artifacts/${artifactDate}/local-postgres-validation`);
const artifactsDir = resolve(repoRoot, args['artifacts-dir'] ?? defaultArtifactsDir);
const defaultReportFile = resolve(repoRoot, join(artifactsDir, `${reportStem}.json`));
const reportFile = args['report-file']
  ? resolve(repoRoot, args['report-file'])
  : pickReportFile(defaultReportFile);
const databaseUrl = args['db-url'] ?? process.env.DATABASE_URL ?? 'postgresql://gp:gp_dev@127.0.0.1:5432/growthpilot';
const dbSchema = args['db-schema'] ?? 'qa_staging_local_validation';
const sampleBatchId = args['sample-batch-id'] ?? 'BATCH-QA-LOCAL-PG-SAMPLE';
const invalidBatchId = args['invalid-batch-id'] ?? 'BATCH-QA-LOCAL-PG-INVALID';
const ensureDockerPostgres = Boolean(args['ensure-docker-postgres']);
const resetSchema = Boolean(args['reset-schema'] ?? true);

if (!/^[a-z_][a-z0-9_]*$/i.test(dbSchema)) {
  throw new Error(`invalid --db-schema value: ${dbSchema}`);
}

mkdirSync(artifactsDir, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  status: 'running',
  repoRoot,
  artifactsDir,
  reportFile,
  preservedReportFile: reportFile === defaultReportFile ? null : defaultReportFile,
  database: {
    connectionString: redactDatabaseUrl(databaseUrl),
    schema: dbSchema,
  },
  docker: {
    requestedComposeUp: ensureDockerPostgres,
    composeUp: null,
    composePs: null,
  },
  connectivity: {
    pgProbe: null,
  },
  runs: [],
  validation: null,
  failures: [],
};

writeReport();

if (ensureDockerPostgres) {
  report.docker.composeUp = runCommand('docker', ['compose', 'up', '-d', 'postgres']);
  report.docker.composePs = runCommand('docker', ['compose', 'ps', 'postgres', '--format', 'json']);
  writeReport();
}

const probe = await probeDatabase(databaseUrl);
report.connectivity.pgProbe = probe;
writeReport();

if (!probe.ok) {
  const probeMessage = formatErrorMessage(probe.error);
  report.status = 'blocked';
  report.failures.push({
    step: 'pg-probe',
    message: probeMessage,
  });
  report.completedAt = new Date().toISOString();
  writeReport();
  console.error(`local postgres validation blocked: ${probeMessage}`);
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  if (resetSchema) {
    await client.query(`drop schema if exists ${dbSchema} cascade`);
  }

  const sampleRunArgs = [
    '--db-apply',
    '--csv',
    sampleCsvPath,
    '--batchId',
    sampleBatchId,
    '--db-url',
    databaseUrl,
    '--db-schema',
    dbSchema,
    '--artifacts-dir',
    artifactsDir,
  ];

  report.runs.push(await runImport('sample-first-apply', sampleRunArgs));
  report.runs.push(await runImport('sample-second-apply', sampleRunArgs));
  report.runs.push(await runImport('invalid-mock-apply', [
    '--db-apply',
    '--batchId',
    invalidBatchId,
    '--db-url',
    databaseUrl,
    '--db-schema',
    dbSchema,
    '--artifacts-dir',
    artifactsDir,
  ]));

  report.validation = await collectValidation(client, {
    dbSchema,
    sampleBatchId,
    invalidBatchId,
  });

  if (!report.validation.passed) {
    report.status = 'failed';
    report.failures.push({
      step: 'validation',
      message: 'live PostgreSQL validation checks did not match expected counts or field mappings',
    });
    process.exitCode = 1;
  } else {
    report.status = 'passed';
  }
} catch (error) {
  report.status = 'failed';
  report.failures.push({
    step: 'runtime',
    message: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
} finally {
  await client.end();
  report.completedAt = new Date().toISOString();
  writeReport();
}

if (report.status === 'passed') {
  console.log(JSON.stringify({
    status: report.status,
    reportFile,
    validation: report.validation,
  }, null, 2));
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

function pickReportFile(defaultPath) {
  const existingReport = readJsonFile(defaultPath);
  if (existingReport?.status !== 'passed') {
    return defaultPath;
  }

  return defaultPath.replace(/\.json$/i, `.rerun-${formatLocalTimestamp(new Date())}.json`);
}

function readJsonFile(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function redactDatabaseUrl(value) {
  try {
    const url = new URL(value);
    if (url.password) {
      url.password = '***';
    }
    return url.toString();
  } catch {
    return value;
  }
}

function runCommand(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  return {
    command: [command, ...commandArgs].join(' '),
    exitCode: result.status ?? 1,
    stdout: normalizeText(result.stdout),
    stderr: normalizeText(result.stderr),
    error: result.error ? serializeError(result.error) : null,
  };
}

async function probeDatabase(connectionString) {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 3000,
  });

  try {
    await client.connect();
    const queryResult = await client.query('select current_database() as database_name, current_user as current_user, version() as version');
    return {
      ok: true,
      row: queryResult.rows[0] ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      error: serializeError(error),
    };
  } finally {
    try {
      await client.end();
    } catch {
      // Connection failures leave nothing to close.
    }
  }
}

async function runImport(label, runnerArgs) {
  const result = spawnSync(process.execPath, [runnerPath, ...runnerArgs], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
  });

  const run = {
    label,
    command: ['node', 'scripts/migration/run-staging-import.mjs', ...runnerArgs].join(' '),
    exitCode: result.status ?? 1,
    stdout: normalizeText(result.stdout),
    stderr: normalizeText(result.stderr),
    summary: null,
  };

  if (run.exitCode !== 0) {
    throw new Error(`${label} failed: ${run.stderr || run.stdout || 'unknown error'}`);
  }

  run.summary = JSON.parse(result.stdout);
  writeReport();
  return run;
}

async function collectValidation(client, { dbSchema, sampleBatchId, invalidBatchId }) {
  const sampleBatch = await queryOne(client, `
    select
      raw_row_count,
      normalized_row_count,
      ready_row_count,
      rejected_row_count
    from ${dbSchema}.import_batches
    where batch_id = $1
  `, [sampleBatchId]);

  const invalidBatch = await queryOne(client, `
    select
      raw_row_count,
      normalized_row_count,
      ready_row_count,
      rejected_row_count
    from ${dbSchema}.import_batches
    where batch_id = $1
  `, [invalidBatchId]);

  const sampleCounts = await queryOne(client, `
    select
      (select count(*)::int from ${dbSchema}.staging_raw_rows where batch_id = $1) as raw_rows,
      (select count(*)::int from ${dbSchema}.staging_normalized_rows where batch_id = $1) as normalized_rows,
      (select count(*)::int from ${dbSchema}.staging_rejects where batch_id = $1) as reject_rows,
      (select count(*)::int from ${dbSchema}.import_batches where batch_id = $1) as batch_rows
  `, [sampleBatchId]);

  const invalidCounts = await queryOne(client, `
    select
      (select count(*)::int from ${dbSchema}.staging_raw_rows where batch_id = $1) as raw_rows,
      (select count(*)::int from ${dbSchema}.staging_normalized_rows where batch_id = $1) as normalized_rows,
      (select count(*)::int from ${dbSchema}.staging_rejects where batch_id = $1) as reject_rows,
      (select count(*)::int from ${dbSchema}.import_batches where batch_id = $1) as batch_rows
  `, [invalidBatchId]);

  const studentMapping = await queryOne(client, `
    select
      business_key,
      normalized_payload->>'studentName' as student_name,
      normalized_payload->>'familyStructure' as family_structure
    from ${dbSchema}.staging_normalized_rows
    where batch_id = $1
      and target_domain = 'students'
    limit 1
  `, [sampleBatchId]);

  const homeworkMapping = await queryOne(client, `
    select
      business_key,
      normalized_payload->>'subject' as subject,
      normalized_payload->>'errorTaxonomyCode' as error_taxonomy_code
    from ${dbSchema}.staging_normalized_rows
    where batch_id = $1
      and target_domain = 'homework'
    limit 1
  `, [sampleBatchId]);

  const billingMapping = await queryOne(client, `
    select
      business_key,
      (normalized_payload->'amounts'->>'payableAmountCents')::int as payable_amount_cents
    from ${dbSchema}.staging_normalized_rows
    where batch_id = $1
      and target_domain = 'billing'
    limit 1
  `, [sampleBatchId]);

  const rejectCodes = await client.query(`
    select reject_code, count(*)::int as row_count
    from ${dbSchema}.staging_rejects
    where batch_id = $1
    group by reject_code
    order by reject_code
  `, [invalidBatchId]);

  const checks = {
    sampleImportBatchCounts: matches(sampleBatch, {
      raw_row_count: 3,
      normalized_row_count: 3,
      ready_row_count: 3,
      rejected_row_count: 0,
    }),
    sampleStagingCounts: matches(sampleCounts, {
      raw_rows: 3,
      normalized_rows: 3,
      reject_rows: 0,
      batch_rows: 1,
    }),
    invalidImportBatchCounts: matches(invalidBatch, {
      raw_row_count: 4,
      normalized_row_count: 4,
      ready_row_count: 1,
      rejected_row_count: 3,
    }),
    invalidStagingCounts: matches(invalidCounts, {
      raw_rows: 4,
      normalized_rows: 4,
      reject_rows: 7,
      batch_rows: 1,
    }),
    fieldMapping: studentMapping?.family_structure === 'single_parent'
      && homeworkMapping?.subject === 'math'
      && homeworkMapping?.error_taxonomy_code === 'NO_ERROR'
      && billingMapping?.payable_amount_cents === 120000,
    rejectReportGenerated: rejectCodes.rows.reduce((sum, row) => sum + row.row_count, 0) === 7,
  };

  return {
    passed: Object.values(checks).every(Boolean),
    checks,
    sampleBatch,
    sampleCounts,
    invalidBatch,
    invalidCounts,
    sampleMappings: {
      student: studentMapping,
      homework: homeworkMapping,
      billing: billingMapping,
    },
    invalidRejectCodes: rejectCodes.rows,
  };
}

async function queryOne(client, sql, params) {
  const result = await client.query(sql, params);
  return result.rows[0] ?? null;
}

function matches(actual, expected) {
  if (!actual) {
    return false;
  }

  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

function normalizeText(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

function serializeError(error) {
  return {
    name: error?.name ?? 'Error',
    message: error?.message ?? String(error),
    code: error?.code ?? null,
    errno: error?.errno ?? null,
    address: error?.address ?? null,
    port: error?.port ?? null,
    errors: Array.isArray(error?.errors)
      ? error.errors.map((item) => ({
          name: item?.name ?? 'Error',
          message: item?.message ?? String(item),
          code: item?.code ?? null,
          errno: item?.errno ?? null,
          address: item?.address ?? null,
          port: item?.port ?? null,
        }))
      : null,
  };
}

function formatErrorMessage(error) {
  if (!error) {
    return 'database probe failed';
  }

  if (error.message) {
    return error.message;
  }

  if (Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors.map((item) => item.message).join('; ');
  }

  return 'database probe failed';
}

function writeReport() {
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
}

function formatLocalDate(value) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(value);
}

function formatLocalTimestamp(value) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(value);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}-${values.hour}${values.minute}${values.second}`;
}
