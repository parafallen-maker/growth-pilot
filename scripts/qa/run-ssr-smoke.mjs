#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildRouteInventory } from './web-surface.mjs';
import { runCompiledRuntimeSmoke } from './compiled-page-runtime.mjs';

const args = parseArgs(process.argv.slice(2));
const repoRoot = process.cwd();
const apiPort = Number(args['api-port'] ?? process.env.QA_API_PORT ?? 3101);
const webPort = Number(args['web-port'] ?? process.env.QA_WEB_PORT ?? 3100);
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api/v1`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const reportFile = args['report-file'] ? path.resolve(repoRoot, args['report-file']) : null;
const username = args.username ?? 'admin';
const password = args.password ?? 'admin123';
const failFast = Boolean(args['fail-fast']);
const skipBuild = Boolean(args['skip-build']);
const listRoutesOnly = Boolean(args['list-routes-only']);
const assertRouteCount = args['assert-route-count'] ? Number(args['assert-route-count']) : null;
const runtimeMode = String(args['runtime-mode'] ?? 'compiled');
const routeFilter = splitCsv(args.routes);
const routePrefixFilter = splitCsv(args['route-prefixes']);
const expectForbiddenPrefixes = splitCsv(args['expect-forbidden-prefixes']);
const expectOkPrefixes = splitCsv(args['expect-ok-prefixes']);

const routeInventory = buildRouteInventory(repoRoot);
const collectedRoutes = routeInventory.routes;
const routes = filterRoutes(collectedRoutes, routeFilter, routePrefixFilter);

if (assertRouteCount !== null && collectedRoutes.length !== assertRouteCount) {
  throw new Error(`expected ${assertRouteCount} routes, got ${collectedRoutes.length}`);
}
if (!routes.length) {
  throw new Error('no routes selected for SSR smoke');
}

if (listRoutesOnly) {
  const summary = {
    ...routeInventory,
    selectedRoutes: routes,
  };

  if (reportFile) {
    writeFileSync(reportFile, JSON.stringify(summary, null, 2));
  }

  console.log(`SSR route inventory listed ${routes.length} routes (full surface: ${collectedRoutes.length})`);
  process.exit(0);
}

if (runtimeMode === 'compiled') {
  const summary = await runCompiledRuntimeSmoke({
    repoRoot,
    routes,
    username,
    failFast,
    expectForbiddenPrefixes,
    expectOkPrefixes,
  });

  if (reportFile) {
    writeFileSync(reportFile, JSON.stringify(summary, null, 2));
  }

  const summaryLine = [
    `Compiled runtime validated ${routes.length} routes`,
    `ok=${summary.totals.ok ?? 0}`,
    `redirect=${summary.totals.redirect ?? 0}`,
    `forbidden=${summary.totals.forbidden ?? 0}`,
    `server_error=${summary.totals.server_error ?? 0}`,
    `failures=${summary.failures.length}`,
  ].join(' | ');
  console.log(summaryLine);

  if (summary.failures.length > 0) {
    throw new Error(summary.failures.map((failure) => `${failure.route} [${failure.classification}] ${failure.errors.join('; ')}`).join('\n'));
  }

  process.exit(0);
}

resetQaFiles();

if (!skipBuild) {
  await run('npm', ['run', 'build', '--workspace', '@growthpilot/api']);
  await run('npm', ['run', 'build', '--workspace', '@growthpilot/web'], {
    env: {
      ...process.env,
      GROWTHPILOT_API_BASE_URL: apiBaseUrl,
    },
  });
}

const api = spawn('node', [path.join('dist', 'apps', 'api', 'src', 'main.js')], {
  cwd: path.join(repoRoot, 'apps/api'),
  env: {
    ...process.env,
    PORT: String(apiPort),
  },
  stdio: 'ignore',
});
const web = spawn('npm', ['run', 'start', '--workspace', '@growthpilot/web', '--', '--port', String(webPort)], {
  cwd: repoRoot,
  env: {
    ...process.env,
    GROWTHPILOT_API_BASE_URL: apiBaseUrl,
  },
  stdio: 'ignore',
});

try {
  await waitForHttp(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    headers: { 'content-type': 'application/json' },
  });
  await waitForHttp(`${webBaseUrl}/login`);

  const cookieHeader = await loginAndBuildCookieHeader(username, password, apiBaseUrl);

  if (!routeFilter.length && !routePrefixFilter.length && collectedRoutes.length !== 31) {
    throw new Error(`expected 31 routes, got ${collectedRoutes.length}`);
  }

  const results = [];
  const failures = [];

  for (const route of routes) {
    const result = await fetchRoute({ route, cookieHeader, webBaseUrl });
    results.push(result);

    const errors = evaluateExpectations(result, { expectForbiddenPrefixes, expectOkPrefixes });
    if (errors.length > 0) {
      failures.push({ route, errors, status: result.status, classification: result.classification });
      if (failFast) {
        break;
      }
    }
  }

  const summary = {
    runtimeMode: 'http',
    username,
    apiBaseUrl,
    webBaseUrl,
    routeCount: routes.length,
    selectedRoutes: routes,
    totals: countBy(results, 'classification'),
    failures,
    results,
  };

  if (reportFile) {
    writeFileSync(reportFile, JSON.stringify(summary, null, 2));
  }

  const summaryLine = [
    `SSR validated ${routes.length} routes`,
    `ok=${summary.totals.ok ?? 0}`,
    `redirect=${summary.totals.redirect ?? 0}`,
    `client_error=${summary.totals.client_error ?? 0}`,
    `server_error=${summary.totals.server_error ?? 0}`,
    `failures=${failures.length}`,
  ].join(' | ');
  console.log(summaryLine);

  if (failures.length > 0) {
    throw new Error(failures.map((failure) => `${failure.route} [${failure.classification} ${failure.status}] ${failure.errors.join('; ')}`).join('\n'));
  }
} finally {
  stopChild(api);
  stopChild(web);
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

function splitCsv(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function loginAndBuildCookieHeader(usernameValue, passwordValue, apiBaseUrlValue) {
  const loginResponse = await fetch(`${apiBaseUrlValue}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ username: usernameValue, password: passwordValue }),
  });
  const loginBody = await loginResponse.json();
  if (!loginResponse.ok) {
    throw new Error(`login failed: ${JSON.stringify(loginBody)}`);
  }

  const accessToken = loginBody.data.accessToken;
  const refreshToken = loginBody.data.refreshToken;
  return `gp_access_token=${accessToken}; gp_refresh_token=${refreshToken}`;
}

async function fetchRoute({ route, cookieHeader, webBaseUrl: baseUrl }) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}${route}`, {
    headers: {
      cookie: cookieHeader,
    },
    redirect: 'manual',
  });
  const body = await response.text();
  return {
    route,
    status: response.status,
    durationMs: Date.now() - startedAt,
    classification: classifyStatus(response.status),
    markers: {
      forbidden: body.includes('无权限访问'),
      login: body.includes('登录'),
      nextError: body.includes('__NEXT_ERROR__') || body.includes('digest:'),
    },
    bodyPreview: body.slice(0, 400),
  };
}

function evaluateExpectations(result, expectationConfig) {
  const errors = [];
  if (result.status >= 500) {
    errors.push('unexpected 5xx response');
  }
  if (matchesPrefix(result.route, expectationConfig.expectForbiddenPrefixes) && !result.markers.forbidden) {
    errors.push('expected forbidden marker');
  }
  if (matchesPrefix(result.route, expectationConfig.expectOkPrefixes) && result.status >= 400) {
    errors.push('expected non-error response');
  }
  return errors;
}

function classifyStatus(status) {
  if (status >= 500) return 'server_error';
  if (status >= 400) return 'client_error';
  if (status >= 300) return 'redirect';
  return 'ok';
}

function matchesPrefix(route, prefixes) {
  return prefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

function filterRoutes(routes, exactRoutes, prefixes) {
  if (!exactRoutes.length && !prefixes.length) {
    return routes;
  }
  return routes.filter((route) => exactRoutes.includes(route) || matchesPrefix(route, prefixes));
}

function resetQaFiles() {
  const files = [
    'apps/api/.data/auth-sessions.json',
    'apps/api/.data/jobs.json',
    'apps/api/.data/users.json',
    'apps/api/.data/settings.json',
    'apps/api/.data/master-data.json',
    'apps/api/.data/homework.json',
    'apps/api/.data/growth.json',
    'apps/api/.data/attendance.json',
    'apps/api/.data/billing.json',
    'apps/api/.data/communication.json',
    'apps/api/.data/files.json',
  ];
  for (const relative of files) {
    rmSync(path.join(repoRoot, relative), { force: true });
  }
}

async function run(command, commandArgs, options = {}) {
  const child = spawn(command, commandArgs, {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
    ...options,
  });
  const [code] = await once(child, 'exit');
  if (code !== 0) {
    throw new Error(`${command} ${commandArgs.join(' ')} failed with exit code ${code}`);
  }
}

function stopChild(child) {
  if (child.exitCode !== null || child.killed) return;
  child.kill('SIGTERM');
}

async function waitForHttp(url, init, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, init);
      if (response.status < 500) return;
      lastError = new Error(`unexpected ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  throw lastError ?? new Error(`timeout waiting for ${url}`);
}

function countBy(items, key) {
  return items.reduce((accumulator, item) => {
    const value = item[key];
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}
