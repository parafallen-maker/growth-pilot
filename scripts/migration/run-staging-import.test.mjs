import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..', '..');
const scriptPath = resolve(repoRoot, 'scripts/migration/run-staging-import.mjs');
const sampleCsvPath = resolve(repoRoot, 'scripts/migration/fixtures/staging-import-sample.csv');

function runScript(args = []) {
  return JSON.parse(execFileSync('node', [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  }));
}

test('migration dry-run keeps mock fallback when no input file is supplied', () => {
  const result = runScript(['--dry-run', '--batchId', 'BATCH-QA-MOCK']);
  assert.equal(result.batchId, 'BATCH-QA-MOCK');
  assert.equal(result.plan.rawRows, 4);
  assert.equal(result.plan.readyToLoadRows, 1);
  assert.equal(result.rejectsByCode.CONFLICT_STUDENT_NO, 1);
});

test('migration dry-run can parse csv input and produce ready-to-load plan', () => {
  const result = runScript(['--dry-run', '--csv', sampleCsvPath, '--batchId', 'BATCH-QA-CSV']);
  assert.equal(result.batchId, 'BATCH-QA-CSV');
  assert.equal(result.sourceSystem, 'file');
  assert.equal(result.sourceFile, 'staging-import-sample.csv');
  assert.equal(result.plan.rawRows, 3);
  assert.equal(result.plan.readyToLoadRows, 3);
  assert.equal(result.plan.rejectedRows, 0);
  assert.deepEqual(result.finalLoadPlan.readyBusinessKeys, ['S-101', 'S-101', 'I-101']);
  assert.deepEqual(result.rejectsByCode, {});
});
