#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { writeFileSync } from 'node:fs';

const args = parseArgs(process.argv.slice(2));
const repoRoot = process.cwd();
const reportFile = args['report-file'] ? path.resolve(repoRoot, args['report-file']) : null;

const listenHosts = ['127.0.0.1', '0.0.0.0', '::1'];
const listenProbes = await Promise.all(listenHosts.map((host, index) => probeListenHost(host, 3911 + index)));
const loopbackListen = listenProbes.find((probe) => probe.host === '127.0.0.1') ?? null;
const dockerProbe = probeDockerSocket();
const listenOk = listenProbes.every((probe) => probe.ok);

const summary = {
  checkedAt: new Date().toISOString(),
  sandboxEvidence: {
    loopbackListen,
    listenHosts: listenProbes,
    dockerSocket: dockerProbe,
  },
  status: listenOk && dockerProbe.ok ? 'clear' : 'blocked',
};

if (reportFile) {
  writeFileSync(reportFile, JSON.stringify(summary, null, 2));
}

console.log(
  [
    `listen_ok=${listenOk}`,
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
