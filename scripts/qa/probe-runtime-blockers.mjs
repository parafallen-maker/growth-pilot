#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { writeFileSync } from 'node:fs';

const args = parseArgs(process.argv.slice(2));
const repoRoot = process.cwd();
const reportFile = args['report-file'] ? path.resolve(repoRoot, args['report-file']) : null;
const connectHost = String(args['connect-host'] ?? '127.0.0.1');
const connectPorts = splitCsv(args['connect-ports'] ?? '3000,3001,3100,3101,5432,6379,9000,9001').map((value) => Number(value));

const listenHosts = ['127.0.0.1', '0.0.0.0', '::1'];
const listenProbes = await Promise.all(listenHosts.map((host, index) => probeListenHost(host, 3911 + index)));
const loopbackListen = listenProbes.find((probe) => probe.host === '127.0.0.1') ?? null;
const connectProbes = await Promise.all(connectPorts.map((port) => probeConnectTarget(connectHost, port)));
const dockerProbe = probeDockerSocket();
const listenOk = listenProbes.every((probe) => probe.ok);
const connectPermissionOk = connectProbes.every((probe) => probe.ok || probe.code === 'ECONNREFUSED');
const reachableTargets = connectProbes.filter((probe) => probe.ok);
const permissionBlockedTargets = connectProbes.filter((probe) => probe.code === 'EPERM');
const unavailableTargets = connectProbes.filter((probe) => !probe.ok && probe.code !== 'EPERM');

const summary = {
  checkedAt: new Date().toISOString(),
  sandboxEvidence: {
    loopbackListen,
    listenHosts: listenProbes,
    loopbackConnect: connectProbes.find((probe) => probe.port === 3000) ?? null,
    connectTargets: connectProbes,
    dockerSocket: dockerProbe,
  },
  status: listenOk && connectPermissionOk ? 'clear' : 'sandbox-blocked',
  statusDetails: {
    listenOk,
    connectPermissionOk,
    reachableTargetCount: reachableTargets.length,
    permissionBlockedTargetCount: permissionBlockedTargets.length,
    unavailableTargetCount: unavailableTargets.length,
    dockerOk: dockerProbe.ok,
  },
};

if (reportFile) {
  writeFileSync(reportFile, JSON.stringify(summary, null, 2));
}

console.log(
  [
    `listen_ok=${listenOk}`,
    `connect_permission_ok=${connectPermissionOk}`,
    `reachable_targets=${reachableTargets.length}/${connectProbes.length}`,
    `docker_ok=${dockerProbe.ok}`,
    `status=${summary.status}`,
  ].join(' | '),
);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
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

async function probeListenHost(host, port) {
  return await new Promise((resolve) => {
    const server = net.createServer((socket) => socket.end('ok'));
    server.once('error', (error) => {
      resolve({
        host,
        ok: false,
        code: error.code ?? null,
        syscall: error.syscall ?? null,
        address: error.address ?? null,
        port: error.port ?? port,
        message: error.message,
      });
    });
    server.listen(port, host, () => {
      server.close(() => {
        resolve({
          host,
          ok: true,
          code: null,
          syscall: null,
          address: host,
          port,
          message: 'listen succeeded',
        });
      });
    });
  });
}

async function probeConnectTarget(host, port) {
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (result) => {
      socket.removeAllListeners();
      if (!socket.destroyed) {
        socket.destroy();
      }
      resolve(result);
    };
    socket.setTimeout(1_500, () => {
      done({
        host,
        port,
        ok: false,
        code: 'ETIMEDOUT',
        message: `connect timeout after 1500ms ${host}:${port}`,
      });
    });
    socket.once('connect', () => {
      done({
        host,
        port,
        ok: true,
        code: null,
        message: 'connect succeeded',
      });
    });
    socket.once('error', (error) => {
      done({
        host,
        port,
        ok: false,
        code: error.code ?? null,
        message: error.message,
      });
    });
  });
}

function probeDockerSocket() {
  const result = spawnSync('docker', ['ps', '--format', '{{.ID}}'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}
