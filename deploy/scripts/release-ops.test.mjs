import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..', '..');
const bootstrapScript = resolve(repoRoot, 'deploy/scripts/bootstrap-release-workspace.mjs');
const releaseScript = resolve(repoRoot, 'deploy/scripts/run-production-migration.mjs');
const envCheckScript = resolve(repoRoot, 'deploy/scripts/validate-release-env.mjs');
const sampleCsv = resolve(repoRoot, 'scripts/migration/fixtures/staging-import-sample.csv');

test('bootstrap-release-workspace creates a populated release directory', () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), 'gp-release-workspace-'));
  try {
    const output = execFileSync('node', [
      bootstrapScript,
      '--release-id',
      'wave5-prod-cutover-001',
      '--target-env',
      'prod',
      '--batch-id',
      'BATCH-PROD-001',
      '--output-dir',
      tempDir,
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    const summary = JSON.parse(output);
    assert.equal(summary.targetEnv, 'prod');
    assert.equal(summary.batchId, 'BATCH-PROD-001');
    assert.ok(existsSync(resolve(tempDir, 'release-gate.yaml')));
    assert.ok(existsSync(resolve(tempDir, 'uat-execution.yaml')));
    assert.ok(existsSync(resolve(tempDir, 'migration-execution-log.md')));
    assert.ok(existsSync(resolve(tempDir, 'migration-validation-checklist.md')));
    assert.ok(existsSync(resolve(tempDir, 'prod-db-init-checklist.md')));
    assert.ok(existsSync(resolve(tempDir, 'sql', 'migration-validation.sql')));
    assert.ok(existsSync(resolve(tempDir, 'checks')));
    assert.ok(existsSync(resolve(tempDir, 'evidence')));
    assert.ok(existsSync(resolve(tempDir, 'logs')));
    assert.ok(existsSync(resolve(tempDir, 'README.md')));

    const readme = readFileSync(resolve(tempDir, 'README.md'), 'utf8');
    assert.match(readme, /wave5-prod-cutover-001 Release Workspace/);
    assert.match(readme, /BATCH-PROD-001/);
    assert.match(readme, /npm run ops:env:check/);
    assert.match(readme, /migration-execution-log\.md/);
    assert.match(readme, /DEPLOY_ENV_FILE=.env\.prod npm run db:backup/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('validate-release-env rejects placeholder production secrets', () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), 'gp-release-env-'));
  const envFile = resolve(tempDir, '.env.prod');

  try {
    writeFileSync(envFile, [
      'NODE_ENV=production',
      'DATABASE_URL=postgresql://gp:STRONG_PASSWORD@db.example.com:5432/growthpilot',
      'REDIS_URL=redis://cache.example.com:6379',
      'JWT_SECRET=growthpilot-dev-secret',
      'JWT_ACCESS_TTL_SECONDS=900',
      'JWT_REFRESH_TTL_SECONDS=2592000',
      'S3_ENDPOINT=https://s3.example.com',
      'S3_ACCESS_KEY=REPLACE_ME',
      'S3_SECRET_KEY=REPLACE_ME',
      'S3_BUCKET=REPLACE_ME',
      'CORS_ORIGIN=https://app.example.com',
      'API_BASE_URL=https://api.example.com',
    ].join('\n'));

    assert.throws(
      () => execFileSync('node', [envCheckScript, '--env-file', envFile, '--mode', 'prod'], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      }),
      (error) => /JWT_SECRET|placeholder\/dev value/i.test(String(error.stderr || error.message)),
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('run-production-migration report-only mode writes release report artifacts', () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), 'gp-release-migration-'));
  try {
    const output = execFileSync('node', [
      releaseScript,
      '--report-only',
      '--target-env',
      'uat',
      '--batch-id',
      'BATCH-UAT-OPS-001',
      '--csv',
      sampleCsv,
      '--artifacts-dir',
      tempDir,
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    assert.match(output, /Migration Release Report/);
    assert.ok(existsSync(resolve(tempDir, 'BATCH-UAT-OPS-001.release-report.md')));

    const report = readFileSync(resolve(tempDir, 'BATCH-UAT-OPS-001.release-report.md'), 'utf8');
    assert.match(report, /targetEnv: `uat`/);
    assert.match(report, /mode: `report-only`/);
    assert.match(report, /Ready Domains/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('run-production-migration blocks prod db apply without explicit confirmation', () => {
  assert.throws(
    () => execFileSync('node', [
      releaseScript,
      '--db-apply',
      '--target-env',
      'prod',
      '--batch-id',
      'BATCH-PROD-GUARD-001',
      '--csv',
      sampleCsv,
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    }),
    (error) => /prod db apply requires --confirm-prod/i.test(String(error.stderr || error.message)),
  );
});
