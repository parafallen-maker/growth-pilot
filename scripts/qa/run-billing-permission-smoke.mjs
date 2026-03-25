#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const smokeScript = resolve(repoRoot, 'scripts/qa/run-ssr-smoke.mjs');
const forwardedArgs = process.argv.slice(2);

const result = spawnSync('node', [
  smokeScript,
  '--username',
  'teacher.zhang',
  '--password',
  'teacher123',
  '--route-prefixes',
  '/billing,/analytics/billing',
  '--expect-forbidden-prefixes',
  '/billing,/analytics/billing',
  ...forwardedArgs,
], {
  cwd: repoRoot,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
