import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..', '..');
const scriptPath = resolve(repoRoot, 'scripts/migration/run-staging-import.mjs');
const sampleCsvPath = resolve(repoRoot, 'fixtures/staging-import-sample.csv');

function runScript(args = [], options = {}) {
  return JSON.parse(execFileSync('node', [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
  }));
}

test('migration dry-run keeps mock fallback when no input file is supplied', () => {
  const result = runScript(['--dry-run', '--batchId', 'BATCH-QA-MOCK']);
  assert.equal(result.batchId, 'BATCH-QA-MOCK');
  assert.equal(result.plan.rawRows, 4);
  assert.equal(result.plan.readyToLoadRows, 1);
  assert.equal(result.rejectsByCode.CONFLICT_STUDENT_NO, 1);
  assert.equal(result.validation.idempotency.importKeyCount, 4);
  assert.equal(result.validation.idempotency.uniqueImportKeyCount, 4);
});

test('migration dry-run can parse sample csv and keep the sample batch fully ready-to-load', () => {
  const result = runScript(['--dry-run', '--csv', sampleCsvPath, '--batchId', 'BATCH-QA-CSV']);
  assert.equal(result.batchId, 'BATCH-QA-CSV');
  assert.equal(result.sourceSystem, 'file');
  assert.equal(result.sourceFile, 'staging-import-sample.csv');
  assert.equal(result.plan.rawRows, 3);
  assert.equal(result.plan.readyToLoadRows, 3);
  assert.equal(result.plan.rejectedRows, 0);
  assert.deepEqual(result.finalLoadPlan.readyBusinessKeys, ['S-101', 'S-101', 'I-101']);
  assert.deepEqual(result.rejectsByCode, {});
  assert.equal(result.validation.fieldMapping.readyRowCount, 3);
});

test('migration artifacts include summary, reject report, and db-plan preview without requiring a live database', () => {
  const artifactsDir = mkdtempSync(resolve(tmpdir(), 'qa-migration-artifacts-'));
  try {
    const result = runScript([
      '--dry-run',
      '--batchId',
      'BATCH-QA-ARTIFACTS',
      '--artifacts-dir',
      artifactsDir,
    ]);

    assert.ok(result.artifacts);
    assert.equal(result.artifacts.directory, artifactsDir);
    assert.ok(existsSync(result.artifacts.summaryJson));
    assert.ok(existsSync(result.artifacts.rawNdjson));
    assert.ok(existsSync(result.artifacts.normalizedNdjson));
    assert.ok(existsSync(result.artifacts.rejectReportCsv));
    assert.ok(existsSync(result.artifacts.dbPlanSql));

    const rejectCsv = readFileSync(result.artifacts.rejectReportCsv, 'utf8');
    assert.match(rejectCsv, /^batchId,sourceFile,sourceSheet,sourceRowNo,/);
    assert.match(rejectCsv, /CONFLICT_STUDENT_NO/);

    const sqlPreview = readFileSync(result.artifacts.dbPlanSql, 'utf8');
    assert.match(sqlPreview, /create schema if not exists qa_staging;/);
    assert.match(sqlPreview, /create table if not exists qa_staging\.staging_raw_rows/);
    assert.match(sqlPreview, /create table if not exists qa_staging\.staging_normalized_rows/);
    assert.match(sqlPreview, /create table if not exists qa_staging\.staging_rejects/);
  } finally {
    rmSync(artifactsDir, { recursive: true, force: true });
  }
});

test('migration db-apply path executes the staging upsert flow against the pg client contract', () => {
  const stubLogFile = resolve(mkdtempSync(resolve(tmpdir(), 'qa-migration-db-apply-')), 'pg-stub-log.json');
  const stubModulePath = resolve(repoRoot, 'fixtures/pg-client-stub.mjs');

  const result = runScript([
    '--db-apply',
    '--batchId',
    'BATCH-QA-DB-APPLY',
    '--db-url',
    'postgresql://qa:qa@localhost:5432/growthpilot',
    '--pg-module',
    stubModulePath,
  ], {
    env: {
      PG_STUB_LOG_FILE: stubLogFile,
    },
  });

  assert.equal(result.mode, 'db-apply');
  assert.deepEqual(result.dbPlan.execution, {
    applied: true,
    schema: 'qa_staging',
    rawRowsUpserted: 4,
    normalizedRowsUpserted: 4,
    rejectsUpserted: 7,
  });

  const operations = JSON.parse(readFileSync(stubLogFile, 'utf8'));
  assert.equal(operations[0].type, 'connect');
  assert.equal(operations.at(-1).type, 'end');

  const queries = operations.filter((operation) => operation.type === 'query').map((operation) => operation.sql);
  assert.match(queries[0], /create schema if not exists qa_staging;/i);
  assert.ok(queries.includes('begin'));
  assert.equal(queries.filter((sql) => /insert into qa_staging\.import_batches/i.test(sql)).length, 1);
  assert.equal(queries.filter((sql) => /insert into qa_staging\.staging_raw_rows/i.test(sql)).length, 4);
  assert.equal(queries.filter((sql) => /insert into qa_staging\.staging_normalized_rows/i.test(sql)).length, 4);
  assert.equal(queries.filter((sql) => /insert into qa_staging\.staging_rejects/i.test(sql)).length, 7);
  assert.ok(queries.includes('commit'));
  assert.ok(!queries.includes('rollback'));
});

test('migration db-apply path fails fast with a clear message when no database url is provided', () => {
  assert.throws(
    () => execFileSync('node', [scriptPath, '--db-apply'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    }),
    (error) => /DATABASE_URL or --db-url is required/i.test(String(error.stderr || error.message)),
  );
});
