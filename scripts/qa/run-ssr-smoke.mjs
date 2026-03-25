#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readdirSync, statSync, rmSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const apiPort = Number(process.env.QA_API_PORT ?? 3101);
const webPort = Number(process.env.QA_WEB_PORT ?? 3100);
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api/v1`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;

const pageDir = path.join(repoRoot, 'apps/web/src/app');
const dynamicRouteValues = {
  familyId: 'family-001',
  studentId: 'student-001',
  submissionId: 'submission-001',
  teacherId: 'teacher-001',
};

resetQaFiles();

await run('npm', ['run', 'build', '--workspace', '@growthpilot/api']);
await run('npm', ['run', 'build', '--workspace', '@growthpilot/web'], {
  env: {
    ...process.env,
    GROWTHPILOT_API_BASE_URL: apiBaseUrl,
  },
});

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
  await waitForHttp(`${apiBaseUrl}/auth/login`, { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'admin123' }), headers: { 'content-type': 'application/json' } });
  await waitForHttp(`${webBaseUrl}/login`);

  const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const loginBody = await loginResponse.json();
  if (!loginResponse.ok) {
    throw new Error(`login failed: ${JSON.stringify(loginBody)}`);
  }

  const accessToken = loginBody.data.accessToken;
  const refreshToken = loginBody.data.refreshToken;
  const cookieHeader = `gp_access_token=${accessToken}; gp_refresh_token=${refreshToken}`;

  const routes = collectPageRoutes(pageDir);
  if (routes.length !== 31) {
    throw new Error(`expected 31 routes, got ${routes.length}`);
  }

  for (const route of routes) {
    const response = await fetch(`${webBaseUrl}${route}`, {
      headers: {
        cookie: cookieHeader,
      },
      redirect: 'manual',
    });

    if (response.status >= 500) {
      const body = await response.text();
      throw new Error(`SSR 500 on ${route}: ${body.slice(0, 500)}`);
    }
  }

  console.log(`SSR smoke passed for ${routes.length} pages`);
} finally {
  stopChild(api);
  stopChild(web);
}

function collectPageRoutes(root) {
  const routes = [];
  walk(root, (file) => {
    if (!file.endsWith(`${path.sep}page.tsx`)) return;
    const relativeDir = path.relative(root, path.dirname(file));
    const segments = relativeDir.split(path.sep).filter(Boolean).filter((segment) => !/^\(.*\)$/.test(segment));
    const route = '/' + segments.map((segment) => {
      const match = /^\[(.+)\]$/.exec(segment);
      if (!match) return segment;
      const key = match[1];
      const value = dynamicRouteValues[key];
      if (!value) throw new Error(`missing dynamic route value for ${key}`);
      return value;
    }).join('/');
    routes.push(route === '/' ? '/' : route.replace(/\/+/g, '/'));
  });
  return routes.sort();
}

function walk(dir, visit) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, visit);
      continue;
    }
    visit(fullPath);
  }
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

async function run(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
    ...options,
  });
  const [code] = await once(child, 'exit');
  if (code !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${code}`);
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
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw lastError ?? new Error(`timeout waiting for ${url}`);
}
