import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { navSections, rolePermissions } from '../src/lib/navigation.ts';

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

test('QA-13 web permission surface keeps teacher users out of billing navigation', () => {
  const teacherSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => rolePermissions.subject_teacher.includes(item.permission)),
    }))
    .filter((section) => section.items.length > 0);
  const teacherHrefs = teacherSections.flatMap((section) => section.items.map((item) => item.href));

  assert.ok(teacherHrefs.includes('/students'));
  assert.ok(!teacherHrefs.some((href) => href.startsWith('/billing')));
  assert.ok(!teacherHrefs.includes('/analytics/billing'));
  assert.ok(!rolePermissions.subject_teacher.includes('billing:contracts:view'));
});

test('QA-14 static responsive audit finds no fixed-width declarations wider than 1280px', () => {
  const result = runJsonScript('scripts/qa/run-responsive-audit.mjs', [
    '--assert-route-count',
    '31',
    '--viewport-widths',
    '1280,1440,1920',
  ]);

  assert.equal(result.status, 'static-pass');
  assert.deepEqual(result.viewportWidths, [1280, 1440, 1920]);
  assert.equal(result.routeCount, 31);
  assert.equal(result.responsiveMetrics.largeFixedWidthDeclarations.length, 0);
  assert.ok(result.responsiveMetrics.mediaQueryMaxWidths.includes(1280));
});
