#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const repoRoot = process.cwd();
const artifactDir = path.resolve(repoRoot, args['artifact-dir'] ?? 'docs/growthpilot/artifacts/qa-12-qa-14-runtime');

mkdirSync(artifactDir, { recursive: true });

const blockerFile = path.join(artifactDir, 'runtime-blockers.json');
const compiledSsrFile = path.join(artifactDir, 'compiled-ssr-smoke.json');
const compiledBillingFile = path.join(artifactDir, 'compiled-billing-permission.json');
const compiledResponsiveFile = path.join(artifactDir, 'compiled-responsive-audit.json');
const localhostSsrFile = path.join(artifactDir, 'localhost-ssr-smoke.json');
const localhostBillingFile = path.join(artifactDir, 'localhost-billing-permission.json');
const summaryFile = path.join(artifactDir, 'qa-12-qa-14-runtime-validation.json');

runRequiredScript([
  'scripts/qa/probe-runtime-blockers.mjs',
  '--connect-ports',
  '3000,3001,3100,3101,5432,6379,9000,9001',
  '--report-file',
  relativeToRepo(blockerFile),
]);

runRequiredScript([
  'scripts/qa/run-ssr-smoke.mjs',
  '--runtime-mode',
  'compiled',
  '--assert-route-count',
  '31',
  '--report-file',
  relativeToRepo(compiledSsrFile),
]);

runRequiredScript([
  'scripts/qa/run-billing-permission-smoke.mjs',
  '--runtime-mode',
  'compiled',
  '--report-file',
  relativeToRepo(compiledBillingFile),
]);

runRequiredScript([
  'scripts/qa/run-responsive-audit.mjs',
  '--assert-route-count',
  '31',
  '--viewport-widths',
  '1280,1440,1920',
  '--report-file',
  relativeToRepo(compiledResponsiveFile),
]);

const blocker = readJson(blockerFile);
const compiledSsr = readJson(compiledSsrFile);
const compiledBilling = readJson(compiledBillingFile);
const compiledResponsive = readJson(compiledResponsiveFile);

const localhostPossible = blocker.status === 'clear';
const localhostSsrAttempt = localhostPossible
  ? runOptionalScript([
      'scripts/qa/run-ssr-smoke.mjs',
      '--runtime-mode',
      'http',
      '--assert-route-count',
      '31',
      '--report-file',
      relativeToRepo(localhostSsrFile),
    ])
  : skippedAttempt('scripts/qa/run-ssr-smoke.mjs', buildBlockedReason(blocker));
const localhostBillingAttempt = localhostPossible
  ? runOptionalScript([
      'scripts/qa/run-billing-permission-smoke.mjs',
      '--runtime-mode',
      'http',
      '--report-file',
      relativeToRepo(localhostBillingFile),
    ])
  : skippedAttempt('scripts/qa/run-billing-permission-smoke.mjs', buildBlockedReason(blocker));

const summary = {
  checkedAt: new Date().toISOString(),
  artifactDir: relativeToRepo(artifactDir),
  runtimeBoundary: {
    localhostPossible,
    blockerReport: relativeToRepo(blockerFile),
    blockerStatus: blocker.status,
    blockerStatusDetails: blocker.statusDetails,
    blockerReason: buildBlockedReason(blocker),
  },
  qa12: {
    taskId: 'QA-12',
    localhostAttempt: summarizeAttempt(localhostSsrAttempt, relativeToRepo(localhostSsrFile)),
    strongestEvidence: {
      mode: compiledSsr.runtimeMode ?? 'compiled',
      reportFile: relativeToRepo(compiledSsrFile),
      totals: compiledSsr.totals,
      routeCount: compiledSsr.routeCount,
      failures: compiledSsr.failures.length,
    },
  },
  qa13: {
    taskId: 'QA-13',
    localhostAttempt: summarizeAttempt(localhostBillingAttempt, relativeToRepo(localhostBillingFile)),
    strongestEvidence: {
      mode: compiledBilling.runtimeMode ?? 'compiled',
      reportFile: relativeToRepo(compiledBillingFile),
      totals: compiledBilling.totals,
      routeCount: compiledBilling.routeCount,
      failures: compiledBilling.failures.length,
    },
  },
  qa14: {
    taskId: 'QA-14',
    localhostBrowserAttempt: {
      attempted: false,
      ok: false,
      reason: localhostPossible
        ? 'No committed browser harness exists under allowed edit scope; strongest executable evidence remains compiled runtime + static responsive audit.'
        : buildBlockedReason(blocker),
    },
    strongestEvidence: {
      mode: compiledResponsive.runtimeMetrics.runtimeMode,
      reportFile: relativeToRepo(compiledResponsiveFile),
      status: compiledResponsive.status,
      routeCount: compiledResponsive.routeCount,
      largeFixedWidthDeclarations: compiledResponsive.responsiveMetrics.largeFixedWidthDeclarations.length,
      runtimeInlineWidthRisks: compiledResponsive.runtimeMetrics.runtimeInlineWidthRisks.length,
      routeExecutionFailures: compiledResponsive.runtimeMetrics.routeExecutionFailures,
    },
  },
};

writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

console.log(
  [
    `localhost_possible=${localhostPossible}`,
    `qa12_mode=${summary.qa12.strongestEvidence.mode}`,
    `qa13_mode=${summary.qa13.strongestEvidence.mode}`,
    `qa14_status=${summary.qa14.strongestEvidence.status}`,
    `summary=${relativeToRepo(summaryFile)}`,
  ].join(' | '),
);

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

function runRequiredScript(scriptArgs) {
  const result = spawnSync('node', scriptArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status !== 0) {
    throw new Error([
      `${scriptArgs[0]} failed with exit code ${result.status}`,
      result.stdout.trim(),
      result.stderr.trim(),
    ].filter(Boolean).join('\n'));
  }
  return result;
}

function runOptionalScript(scriptArgs) {
  const result = spawnSync('node', scriptArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return {
    attempted: true,
    ok: result.status === 0,
    exitCode: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    script: scriptArgs[0],
  };
}

function skippedAttempt(script, reason) {
  return {
    attempted: false,
    ok: false,
    exitCode: null,
    stdout: '',
    stderr: '',
    script,
    reason,
  };
}

function summarizeAttempt(attempt, reportFile) {
  return {
    attempted: attempt.attempted,
    ok: attempt.ok,
    exitCode: attempt.exitCode,
    reportFile: attempt.ok ? reportFile : null,
    reason: attempt.reason ?? null,
    stdout: attempt.stdout || null,
    stderr: attempt.stderr || null,
  };
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function relativeToRepo(targetPath) {
  return path.relative(repoRoot, targetPath) || '.';
}

function buildBlockedReason(blocker) {
  const listenBlockers = (blocker.sandboxEvidence.listenHosts ?? [])
    .filter((probe) => !probe.ok)
    .map((probe) => `${probe.host}:${probe.port} ${probe.code}`);
  const connectBlockers = (blocker.sandboxEvidence.connectTargets ?? [])
    .filter((probe) => !probe.ok)
    .map((probe) => `${probe.host}:${probe.port} ${probe.code}`);
  const reasons = [];
  if (listenBlockers.length > 0) {
    reasons.push(`listen blocked on ${listenBlockers.join(', ')}`);
  }
  if (connectBlockers.length > 0) {
    reasons.push(`connect blocked on ${connectBlockers.join(', ')}`);
  }
  if (!blocker.sandboxEvidence.dockerSocket?.ok) {
    reasons.push(`docker unavailable: ${blocker.sandboxEvidence.dockerSocket?.stderr ?? 'unknown error'}`);
  }
  return reasons.join('; ');
}
