import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testDir, '..', '..', '..');

function runJsonScript(scriptRelativePath: string, args: string[]) {
  const reportDir = mkdtempSync(resolve(tmpdir(), 'qa-web-surface-'));
  const reportFile = resolve(reportDir, 'report.json');

  try {
    execFileSync('node', [resolve(repoRoot, scriptRelativePath), ...args, '--report-file', reportFile], {
      cwd: repoRoot,
      stdio: 'pipe',
      encoding: 'utf8',
    });

    return JSON.parse(readFileSync(reportFile, 'utf8'));
  } finally {
    rmSync(reportDir, { recursive: true, force: true });
  }
}

test('QA-12 route inventory lists all 31 app pages without requiring localhost runtime', () => {
  const result = runJsonScript('scripts/qa/run-ssr-smoke.mjs', [
    '--list-routes-only',
    '--assert-route-count',
    '31',
  ]);

  assert.equal(result.routeCount, 31);
  assert.ok(result.routes.includes('/billing/contracts'));
  assert.ok(result.routes.includes('/students/student-001'));
  assert.ok(result.routes.includes('/homework/review/submission-001'));
});

test('QA-13 compiled permission smoke returns forbidden surfaces for teacher billing routes', () => {
  const result = runJsonScript('scripts/qa/run-billing-permission-smoke.mjs', []);

  assert.equal(result.runtimeMode, 'compiled');
  assert.equal(result.routeCount, 5);
  assert.equal(result.failures.length, 0);
  assert.deepEqual(result.totals, { forbidden: 5 });
  assert.ok(result.results.every((entry: { markers: { forbidden: boolean } }) => entry.markers.forbidden));
});

test('QA-14 responsive audit passes static CSS and compiled runtime inline-width checks', () => {
  const result = runJsonScript('scripts/qa/run-responsive-audit.mjs', [
    '--assert-route-count',
    '31',
    '--viewport-widths',
    '1280,1440,1920',
  ]);

  assert.equal(result.status, 'runtime-static-pass');
  assert.deepEqual(result.viewportWidths, [1280, 1440, 1920]);
  assert.equal(result.routeCount, 31);
  assert.equal(result.responsiveMetrics.largeFixedWidthDeclarations.length, 0);
  assert.equal(result.runtimeMetrics.routeExecutionFailures, 0);
  assert.equal(result.runtimeMetrics.runtimeInlineWidthRisks.length, 0);
  assert.ok(result.responsiveMetrics.mediaQueryMaxWidths.includes(1280));
});
