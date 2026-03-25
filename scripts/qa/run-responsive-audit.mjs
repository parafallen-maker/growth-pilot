#!/usr/bin/env node
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { buildRouteInventory, collectResponsiveMetrics } from './web-surface.mjs';
import { collectCompiledResponsiveMetrics } from './compiled-page-runtime.mjs';

const args = parseArgs(process.argv.slice(2));
const repoRoot = process.cwd();
const viewportWidths = splitCsv(args['viewport-widths'] ?? '1280,1440,1920').map((value) => Number(value));
const reportFile = args['report-file'] ? path.resolve(repoRoot, args['report-file']) : null;
const assertRouteCount = args['assert-route-count'] ? Number(args['assert-route-count']) : null;

const routeInventory = buildRouteInventory(repoRoot);
const responsiveMetrics = collectResponsiveMetrics(repoRoot);
const compiledRuntimeMetrics = await collectCompiledResponsiveMetrics({
  repoRoot,
  routes: routeInventory.routes,
  username: args.username ?? 'admin',
});
const smallestViewportWidth = Math.min(...viewportWidths);
const largeFixedWidthDeclarations = responsiveMetrics.declarations.filter((declaration) =>
  declaration.pxValues.some((value) => value > smallestViewportWidth),
);
const runtimeInlineWidthRisks = compiledRuntimeMetrics.inlineStyleDeclarations.filter((declaration) => declaration.px > smallestViewportWidth);
const hasStackingBreakpoint = responsiveMetrics.mediaQueryMaxWidths.some((value) => value <= smallestViewportWidth);

if (assertRouteCount !== null && routeInventory.routeCount !== assertRouteCount) {
  throw new Error(`expected ${assertRouteCount} routes, got ${routeInventory.routeCount}`);
}

const summary = {
  viewportWidths,
  routeCount: routeInventory.routeCount,
  businessRouteCount: routeInventory.businessRouteCount,
  routes: routeInventory.routes,
  responsiveMetrics: {
    cssPath: responsiveMetrics.cssPath,
    mediaQueryMaxWidths: responsiveMetrics.mediaQueryMaxWidths,
    declarationsChecked: responsiveMetrics.declarations.length,
    largeFixedWidthDeclarations,
    hasStackingBreakpoint,
  },
  runtimeMetrics: {
    runtimeMode: compiledRuntimeMetrics.runtimeMode,
    routeExecutionFailures: compiledRuntimeMetrics.routeExecutionFailures,
    clientBoundaryRoutes: compiledRuntimeMetrics.clientBoundaryRoutes,
    inlineStyleDeclarationsChecked: compiledRuntimeMetrics.inlineStyleDeclarations.length,
    runtimeInlineWidthRisks,
  },
  status: largeFixedWidthDeclarations.length === 0
    && runtimeInlineWidthRisks.length === 0
    && compiledRuntimeMetrics.routeExecutionFailures === 0
    && hasStackingBreakpoint
    ? 'runtime-static-pass'
    : 'needs-follow-up',
  notes: [
    'Static audit checks CSS width declarations and breakpoint inventory only.',
    'Compiled runtime adds in-process page execution and inline-style width inspection without binding localhost.',
    'Browser-level overflow validation still requires a localhost-capable runtime.',
  ],
};

if (reportFile) {
  writeFileSync(reportFile, JSON.stringify(summary, null, 2));
}

console.log(
  [
    `Responsive audit checked ${summary.routeCount} routes`,
    `viewports=${viewportWidths.join('/')}`,
    `large_width_risks=${largeFixedWidthDeclarations.length}`,
    `runtime_inline_risks=${runtimeInlineWidthRisks.length}`,
    `runtime_failures=${compiledRuntimeMetrics.routeExecutionFailures}`,
    `breakpoints=${responsiveMetrics.mediaQueryMaxWidths.join('/')}`,
    `status=${summary.status}`,
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

function splitCsv(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
