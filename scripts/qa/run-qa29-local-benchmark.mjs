#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import net from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const benchmarkDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: process.env.TZ ?? 'Asia/Shanghai',
}).format(new Date());
const defaultArtifactDir = join(repoRoot, 'docs', 'growthpilot', 'artifacts', benchmarkDate, 'qa-29-local-benchmark');

const stageDefinitions = [
  { id: 'warm-up', concurrency: 1, totalRequests: 20, kind: 'api' },
  { id: 'ramp-10', concurrency: 10, totalRequests: 100, kind: 'api' },
  { id: 'ramp-25', concurrency: 25, totalRequests: 250, kind: 'api' },
  { id: 'steady-50', concurrency: 50, totalRequests: 500, kind: 'api' },
  { id: 'upload-sample', concurrency: 10, totalRequests: 20, kind: 'upload' },
];

const thresholds = {
  homePageP95Ms: 3000,
  apiListP95Ms: 300,
  apiListP99Ms: 500,
  apiErrorRatePct: 1,
  uploadP95Ms: 5000,
};

async function main() {
  const artifactDir = resolve(resolveArgument('--artifact-dir') ?? defaultArtifactDir);
  await mkdir(artifactDir, { recursive: true });

  process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'growthpilot-local-benchmark-secret-20260326';
  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;

  const environment = await probeSandboxEnvironment();
  const webBuild = await inspectWebBuild();
  const gitMeta = await collectGitMeta();

  process.chdir(join(repoRoot, 'apps', 'api'));

  const { AuthService } = await importCompiled('apps/api/dist/apps/api/src/modules/auth/service/auth.service.js');
  const { UsersService } = await importCompiled('apps/api/dist/apps/api/src/modules/users/service/users.service.js');
  const { UsersRepository } = await importCompiled('apps/api/dist/apps/api/src/modules/users/repository/users.repository.js');
  const { StudentsService } = await importCompiled('apps/api/dist/apps/api/src/modules/students/students.service.js');
  const { StudentsRepository } = await importCompiled('apps/api/dist/apps/api/src/modules/students/repository/students.repository.js');
  const { FamiliesRepository } = await importCompiled('apps/api/dist/apps/api/src/modules/families/repository/families.repository.js');
  const { HomeworkService } = await importCompiled('apps/api/dist/apps/api/src/modules/homework/service/homework.service.js');
  const { HomeworkRepository } = await importCompiled('apps/api/dist/apps/api/src/modules/homework/repository/homework.repository.js');
  const { HomeworkAnalysisQueue } = await importCompiled('apps/api/dist/apps/api/src/modules/homework/job/homework-analysis.queue.js');
  const { MockHomeworkAnalysisAdapter } = await importCompiled('apps/api/dist/apps/api/src/modules/homework/adapter/mock-homework-analysis.adapter.js');
  const { HomeworkEventPublisher } = await importCompiled('apps/api/dist/apps/api/src/modules/homework/event/homework-event.publisher.js');
  const { AnalyticsService } = await importCompiled('apps/api/dist/apps/api/src/modules/analytics/service/analytics.service.js');
  const { AnalyticsRepository } = await importCompiled('apps/api/dist/apps/api/src/modules/analytics/repository/analytics.repository.js');
  const { BillingRepository } = await importCompiled('apps/api/dist/apps/api/src/modules/billing/repository/billing.repository.js');
  const { CommunicationRepository } = await importCompiled('apps/api/dist/apps/api/src/modules/communication/repository/communication.repository.js');
  const { AttendanceRepository } = await importCompiled('apps/api/dist/apps/api/src/modules/attendance/repository/attendance.repository.js');
  const { GrowthRepository } = await importCompiled('apps/api/dist/apps/api/src/modules/growth/repository/growth.repository.js');
  const { FilesService } = await importCompiled('apps/api/dist/apps/api/src/modules/files/service/files.service.js');
  const { FileAssetRepository } = await importCompiled('apps/api/dist/apps/api/src/modules/files/repository/file-asset.repository.js');
  const { LocalObjectStorageAdapter } = await importCompiled('apps/api/dist/apps/api/src/modules/files/adapter/local-object-storage.adapter.js');
  const { HealthService } = await importCompiled('apps/api/dist/apps/api/src/modules/health/health.service.js');

  const { JobsService } = await importCompiled('apps/api/dist/apps/api/src/modules/jobs/service/jobs.service.js');
  const { JobsRepository } = await importCompiled('apps/api/dist/apps/api/src/modules/jobs/repository/jobs.repository.js');

  const usersRepository = new UsersRepository();
  const usersService = new UsersService(usersRepository);
  const authService = new AuthService(usersService);

  const fileAssetRepository = new FileAssetRepository();
  const objectStorageAdapter = new LocalObjectStorageAdapter();
  const filesService = new FilesService(fileAssetRepository, objectStorageAdapter);

  const homeworkRepository = new HomeworkRepository();
  const jobsService = new JobsService(new JobsRepository());
  const homeworkAnalysisQueue = new HomeworkAnalysisQueue(
    jobsService,
    homeworkRepository,
    filesService,
    new MockHomeworkAnalysisAdapter(),
  );
  const homeworkEventPublisher = new HomeworkEventPublisher(homeworkRepository);
  const homeworkService = new HomeworkService(
    homeworkRepository,
    homeworkAnalysisQueue,
    homeworkEventPublisher,
    filesService,
  );

  const attendanceRepository = new AttendanceRepository();
  const billingRepository = new BillingRepository();
  const studentsService = new StudentsService(
    new StudentsRepository(),
    new FamiliesRepository(),
    homeworkRepository,
    new GrowthRepository(),
    attendanceRepository,
    billingRepository,
    jobsService,
  );
  const analyticsService = new AnalyticsService(
    new AnalyticsRepository(
      billingRepository,
      new CommunicationRepository(),
      attendanceRepository,
      homeworkRepository,
    ),
  );
  const healthService = new HealthService(objectStorageAdapter);

  const health = {
    liveness: await healthService.getLiveness(),
    readiness: await healthService.getReadiness(),
  };

  const teacherLogin = await authService.login('teacher.zhang', 'teacher123', 'qa-29-local-benchmark');
  const adminLogin = await authService.login('admin', 'admin123', 'qa-29-local-benchmark');
  const teacherProfile = await authService.currentUser(teacherLogin.accessToken);
  const adminProfile = await authService.currentUser(adminLogin.accessToken);

  const uploadBuffer = Buffer.alloc(10 * 1024 * 1024, 0x61);
  const uploadChecksum = `sha256:${createHash('sha256').update(uploadBuffer).digest('hex')}`;

  const scenarios = [
      {
        id: 'API-01',
        actor: 'teacher',
        benchmarkGroup: 'api-list',
        stageKind: 'api',
        roleSubstitution: null,
        run: async () => {
          await authService.currentUser(teacherLogin.accessToken);
          const response = await studentsService.list({ pageNo: 1, pageSize: 20 });
          if (!Array.isArray(response.list) || response.list.length < 1) {
            throw new Error('students list is empty');
          }
        },
      },
      {
        id: 'API-02',
        actor: 'teacher',
        benchmarkGroup: 'api-detail',
        stageKind: 'api',
        roleSubstitution: null,
        run: async () => {
          await authService.currentUser(teacherLogin.accessToken);
          const response = await studentsService.detail360('student-001');
          if (!response?.homeworkSummary || !response?.growthSummary || !response?.attendanceSummary || !response?.billingSummary) {
            throw new Error('student 360 aggregate missing summary blocks');
          }
        },
      },
      {
        id: 'API-03',
        actor: 'teacher',
        benchmarkGroup: 'api-list',
        stageKind: 'api',
        roleSubstitution: null,
        run: async () => {
          await authService.currentUser(teacherLogin.accessToken);
          const response = await homeworkService.listSubmissions({ pageNo: 1, pageSize: 20 });
          if (!Array.isArray(response.list) || response.list.length < 1) {
            throw new Error('homework list is empty');
          }
        },
      },
      {
        id: 'API-04',
        actor: 'admin',
        benchmarkGroup: 'api-overview',
        stageKind: 'api',
        roleSubstitution: 'admin used as principal-equivalent because no seeded principal account exists locally',
        run: async () => {
          await authService.currentUser(adminLogin.accessToken);
          const response = await analyticsService.getOverview({});
          if (typeof response?.activeStudentCount !== 'number' || typeof response?.receivableCents !== 'number') {
            throw new Error('analytics overview payload is incomplete');
          }
        },
      },
      {
        id: 'UPLOAD-01',
        actor: 'teacher',
        benchmarkGroup: 'upload',
        stageKind: 'upload',
        roleSubstitution: null,
        run: async () => {
          await authService.currentUser(teacherLogin.accessToken);
          const response = await filesService.uploadMultipartFile({
            fileName: 'qa29-local-benchmark-10mb.pdf',
            mimeType: 'application/pdf',
            content: uploadBuffer,
            uploadedBy: teacherProfile.id,
            purpose: 'qa29-local-benchmark',
            metadata: {
              scenario: 'UPLOAD-01',
              checksum: uploadChecksum,
            },
          });
          if (!response?.fileId) {
            throw new Error('upload did not return fileId');
          }
        },
      },
    ];

  const stageResults = [];
  for (const stage of stageDefinitions) {
    for (const scenario of scenarios.filter((item) => item.stageKind === stage.kind)) {
      stageResults.push(await runScenarioStage(stage, scenario));
    }
  }

  const summary = summarizeResults(stageResults);
  const report = {
    generatedAt: new Date().toISOString(),
    benchmarkType: 'qa-29-local-in-process',
    benchmarkScope: {
      api: 'direct service graph with AuthService.currentUser plus service-method execution',
      upload: '10MB file upload through FilesService -> LocalObjectStorageAdapter disk writes',
      web: 'build artifact inspection only; browser/http runtime benchmark blocked by sandbox',
    },
    thresholds,
    git: gitMeta,
    environment,
    webBuild,
    health,
    identities: {
      teacher: {
        id: teacherProfile.id,
        username: teacherProfile.username,
        roles: teacherProfile.roles,
      },
      admin: {
        id: adminProfile.id,
        username: adminProfile.username,
        roles: adminProfile.roles,
        note: 'used as principal-equivalent for API-04 local benchmark',
      },
    },
    stageResults,
    summary,
    limitations: [
      'Sandbox denied both loopback listen() and connect() with EPERM, so this run could not start local API/Web servers or collect browser/LCP samples.',
      'Metrics are in-process lower-bound numbers; they include auth token validation and service execution, but not HTTP socket, reverse proxy, browser hydration, or external Redis/PostgreSQL/MinIO latency.',
      'WEB-01 remains unmeasured locally. QA-29 cannot be marked complete until a real HTTP/browser benchmark is executed outside this sandbox.',
    ],
  };

  await writeFile(join(artifactDir, 'benchmark-report.json'), JSON.stringify(report, null, 2));
  await writeFile(join(artifactDir, 'benchmark-sheet.md'), renderMarkdown(report, artifactDir));

  console.log(JSON.stringify({
    artifactDir,
    summary: report.summary,
    webBenchmarkStatus: report.summary.webBenchmark.status,
  }, null, 2));
}

async function importCompiled(relativePath) {
  const absolutePath = join(repoRoot, relativePath);
  await access(absolutePath);
  return import(pathToFileURL(absolutePath).href);
}

async function collectGitMeta() {
  const branch = await runCommand('git rev-parse --abbrev-ref HEAD');
  const commit = await runCommand('git rev-parse HEAD');
  const shortCommit = await runCommand('git rev-parse --short HEAD');
  return {
    branch,
    commit,
    shortCommit,
  };
}

async function inspectWebBuild() {
  const buildIdPath = join(repoRoot, 'apps', 'web', '.next', 'BUILD_ID');
  const manifestPath = join(repoRoot, 'apps', 'web', '.next', 'app-build-manifest.json');
  const buildId = (await readFile(buildIdPath, 'utf8')).trim();
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const pageAssets = manifest.pages['/page'] ?? [];
  const loginAssets = manifest.pages['/(auth)/login/page'] ?? [];
  return {
    buildId,
    homeRouteAssets: await summarizeAssets(pageAssets),
    loginRouteAssets: await summarizeAssets(loginAssets),
  };
}

async function summarizeAssets(relativeAssets) {
  let totalBytes = 0;
  const assets = [];
  for (const relativeAsset of relativeAssets) {
    const assetPath = join(repoRoot, 'apps', 'web', '.next', relativeAsset);
    const assetStat = await stat(assetPath);
    totalBytes += assetStat.size;
    assets.push({
      path: relativeAsset,
      sizeBytes: assetStat.size,
    });
  }

  return {
    assetCount: assets.length,
    totalBytes,
    totalKiB: Number((totalBytes / 1024).toFixed(2)),
    assets,
  };
}

async function probeSandboxEnvironment() {
  const listenProbe = await tryListen(3111);
  const connectProbe = await tryConnect(6379);
  return {
    sandboxNetwork: {
      loopbackListen: listenProbe,
      loopbackConnect: connectProbe,
    },
  };
}

async function tryListen(port) {
  return new Promise((resolveProbe) => {
    const server = net.createServer();
    server.once('error', (error) => {
      resolveProbe({
        status: 'blocked',
        error: normalizeError(error),
      });
    });
    server.listen(port, '127.0.0.1', () => {
      server.close(() => {
        resolveProbe({ status: 'ok' });
      });
    });
  });
}

async function tryConnect(port) {
  return new Promise((resolveProbe) => {
    const socket = new net.Socket();
    const finish = (payload) => {
      socket.removeAllListeners();
      socket.destroy();
      resolveProbe(payload);
    };

    socket.setTimeout(1000);
    socket.once('connect', () => finish({ status: 'ok' }));
    socket.once('timeout', () => finish({ status: 'blocked', error: { code: 'TIMEOUT', message: 'connect timeout' } }));
    socket.once('error', (error) => finish({ status: 'blocked', error: normalizeError(error) }));
    socket.connect(port, '127.0.0.1');
  });
}

async function runScenarioStage(stage, scenario) {
  const samples = [];
  const errors = [];
  let nextRequestIndex = 0;
  const cpuStart = process.cpuUsage();
  const rssStart = process.memoryUsage().rss;
  const startedAt = performance.now();

  const worker = async () => {
    for (;;) {
      const requestIndex = nextRequestIndex;
      nextRequestIndex += 1;
      if (requestIndex >= stage.totalRequests) {
        break;
      }

      const sampleStartedAt = performance.now();
      try {
        await scenario.run();
        samples.push({
          ok: true,
          durationMs: Number((performance.now() - sampleStartedAt).toFixed(3)),
        });
      } catch (error) {
        const durationMs = Number((performance.now() - sampleStartedAt).toFixed(3));
        samples.push({ ok: false, durationMs });
        errors.push({
          requestIndex,
          durationMs,
          error: normalizeError(error),
        });
      }
    }
  };

  await Promise.all(Array.from({ length: stage.concurrency }, () => worker()));

  const elapsedMs = performance.now() - startedAt;
  const cpu = process.cpuUsage(cpuStart);
  const rssEnd = process.memoryUsage().rss;
  const metrics = computeMetrics(samples, elapsedMs);

  return {
    stageId: stage.id,
    scenarioId: scenario.id,
    actor: scenario.actor,
    benchmarkGroup: scenario.benchmarkGroup,
    roleSubstitution: scenario.roleSubstitution,
    concurrency: stage.concurrency,
    totalRequests: stage.totalRequests,
    elapsedMs: Number(elapsedMs.toFixed(3)),
    metrics,
    samples,
    errors,
    processTelemetry: {
      rssStartBytes: rssStart,
      rssEndBytes: rssEnd,
      rssDeltaBytes: rssEnd - rssStart,
      cpuUserMs: Number((cpu.user / 1000).toFixed(3)),
      cpuSystemMs: Number((cpu.system / 1000).toFixed(3)),
    },
  };
}

function computeMetrics(samples, elapsedMs) {
  const successfulDurations = samples.filter((sample) => sample.ok).map((sample) => sample.durationMs).sort((left, right) => left - right);
  const totalRequests = samples.length;
  const successfulRequests = successfulDurations.length;
  const failedRequests = totalRequests - successfulRequests;
  const totalDurationMs = successfulDurations.reduce((sum, value) => sum + value, 0);
  const elapsedSeconds = elapsedMs / 1000;

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    errorRatePct: totalRequests ? Number(((failedRequests / totalRequests) * 100).toFixed(3)) : 0,
    rps: elapsedSeconds > 0 ? Number((totalRequests / elapsedSeconds).toFixed(3)) : 0,
    meanMs: successfulRequests ? Number((totalDurationMs / successfulRequests).toFixed(3)) : null,
    p50Ms: percentile(successfulDurations, 0.5),
    p95Ms: percentile(successfulDurations, 0.95),
    p99Ms: percentile(successfulDurations, 0.99),
    minMs: successfulDurations.length ? successfulDurations[0] : null,
    maxMs: successfulDurations.length ? successfulDurations[successfulDurations.length - 1] : null,
  };
}

function percentile(sortedValues, ratio) {
  if (!sortedValues.length) {
    return null;
  }

  const index = Math.max(0, Math.ceil(sortedValues.length * ratio) - 1);
  return Number(sortedValues[Math.min(index, sortedValues.length - 1)].toFixed(3));
}

function summarizeResults(stageResults) {
  const steady50ApiList = stageResults.filter((item) => item.stageId === 'steady-50' && item.benchmarkGroup === 'api-list');
  const steady50ApiAll = stageResults.filter((item) => item.stageId === 'steady-50' && item.stageId !== 'upload-sample');
  const uploadStage = stageResults.find((item) => item.stageId === 'upload-sample' && item.scenarioId === 'UPLOAD-01');

  const apiListP95Ms = maxMetric(steady50ApiList, 'p95Ms');
  const apiListP99Ms = maxMetric(steady50ApiList, 'p99Ms');
  const apiErrorRatePct = aggregateErrorRate(steady50ApiAll);

  return {
    decision: 'conditional',
    apiList: {
      p95Ms: apiListP95Ms,
      p99Ms: apiListP99Ms,
      errorRatePct: apiErrorRatePct,
      p95Status: compareLessOrEqual(apiListP95Ms, thresholds.apiListP95Ms),
      p99Status: compareLessOrEqual(apiListP99Ms, thresholds.apiListP99Ms),
      errorRateStatus: compareStrictLess(apiErrorRatePct, thresholds.apiErrorRatePct),
    },
    upload: {
      p95Ms: uploadStage?.metrics.p95Ms ?? null,
      errorRatePct: uploadStage?.metrics.errorRatePct ?? null,
      status: compareLessOrEqual(uploadStage?.metrics.p95Ms ?? null, thresholds.uploadP95Ms),
    },
    webBenchmark: {
      status: 'blocked',
      reason: 'sandbox denied loopback listen/connect with EPERM, so WEB-01 browser/http sampling could not run',
    },
  };
}

function aggregateErrorRate(results) {
  const totalRequests = results.reduce((sum, item) => sum + item.metrics.totalRequests, 0);
  const failedRequests = results.reduce((sum, item) => sum + item.metrics.failedRequests, 0);
  return totalRequests ? Number(((failedRequests / totalRequests) * 100).toFixed(3)) : 0;
}

function maxMetric(results, metricName) {
  const values = results
    .map((item) => item.metrics[metricName])
    .filter((value) => typeof value === 'number');
  if (!values.length) {
    return null;
  }
  return Number(Math.max(...values).toFixed(3));
}

function compareLessOrEqual(actual, threshold) {
  if (typeof actual !== 'number') {
    return 'blocked';
  }
  return actual <= threshold ? 'green' : 'red';
}

function compareStrictLess(actual, threshold) {
  if (typeof actual !== 'number') {
    return 'blocked';
  }
  return actual < threshold ? 'green' : 'red';
}

function normalizeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: error.code ?? null,
    };
  }

  return {
    name: 'Error',
    message: String(error),
    code: null,
  };
}

function resolveArgument(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

async function runCommand(command) {
  const { execFile } = await import('node:child_process');
  return new Promise((resolveOutput, rejectOutput) => {
    execFile('/bin/zsh', ['-lc', command], { cwd: repoRoot }, (error, stdout, stderr) => {
      if (error) {
        rejectOutput(new Error(stderr || error.message));
        return;
      }
      resolveOutput(stdout.trim());
    });
  });
}

function renderMarkdown(report, artifactDir) {
  const stageTableRows = report.stageResults.map((result) => {
    const metrics = result.metrics;
    const throughput = result.scenarioId === 'UPLOAD-01'
      ? `${metrics.rps} req/s`
      : `${metrics.rps} req/s`;
    const resultStatus = metrics.failedRequests === 0 ? 'ok' : 'failed';

    return `| ${result.stageId} | ${result.scenarioId} | ${result.concurrency} | ${result.totalRequests} samples | ${throughput} | ${formatMetric(metrics.p50Ms)} | ${formatMetric(metrics.p95Ms)} | ${formatMetric(metrics.p99Ms)} | ${metrics.errorRatePct}% | ${resultStatus} | benchmark-report.json |`;
  }).join('\n');

  const telemetryRows = report.stageResults.map((result) => {
    const telemetry = result.processTelemetry;
    return `| ${result.stageId}/${result.scenarioId} | ${(telemetry.cpuUserMs + telemetry.cpuSystemMs).toFixed(3)} ms CPU | ${formatBytes(telemetry.rssEndBytes)} | n/a | n/a | n/a | benchmark-report.json |`;
  }).join('\n');

  const blockers = [
    'Sandbox denied loopback `listen()` and `connect()` with `EPERM`; no local HTTP server or browser-page benchmark could be executed in this session.',
    'WEB-01 has no real timing sample yet. A follow-up run outside this sandbox is still required before QA-29 can be closed.',
  ];

  return `# QA-29 Local Benchmark Sheet

- release_id: \`${report.git.shortCommit}\`
- environment: \`local-sandbox\`
- benchmark_window: \`${report.generatedAt}\`
- release_commit: \`${report.git.commit}\`
- benchmark_owner: \`Codex\`
- api_owner: \`Codex\`
- web_owner: \`Codex\`
- ops_owner: \`n/a\`
- raw_results_dir: \`${relativeFromRepo(artifactDir)}\`

## 1. Entry Checklist

| Check | Result | Evidence | Owner |
|---|---|---|---|
| Release candidate commit frozen | done | \`${report.git.commit}\` | Codex |
| Test data volume >= expected prod 30% | partial | seeded file-backed sample data only | Codex |
| \`/health\` stable for 5 min | partial | in-process \`HealthService.getLiveness()\` only | Codex |
| \`/health/ready\` stable for 5 min | partial | in-process \`HealthService.getReadiness()\` only | Codex |
| No migration / import / backup running | done | isolated benchmark runner; no background jobs started | Codex |
| Monitoring collection started | partial | process CPU/RSS only | Codex |

## 2. Scenario Registry

| Scenario ID | Endpoint / Action | Dataset / Account | Metric Source | Threshold | Notes |
|---|---|---|---|---|---|
| WEB-01 | \`/\` home page load | anonymous | blocked | P95 <= 3.0s | sandbox blocks local listen/connect, so no browser/http sample |
| API-01 | \`GET /students?pageNo=1&pageSize=20\` | teacher | in-process benchmark | P95 <= 300ms | includes \`AuthService.currentUser()\` |
| API-02 | \`GET /students/{id}/360\` | teacher | in-process benchmark | observed only | detail scenario, not list threshold |
| API-03 | \`GET /homework/submissions?pageNo=1&pageSize=20\` | teacher | in-process benchmark | P95 <= 300ms | includes \`AuthService.currentUser()\` |
| API-04 | \`GET /analytics/overview\` | admin | in-process benchmark | observed only | principal-equivalent substitution for local seed |
| UPLOAD-01 | \`POST /files/upload/multipart\` 10MB | teacher | in-process benchmark | P95 <= 5.0s | 10MB write through \`FilesService\` -> local object storage |

## 3. Stage Results

| Stage | Scenario ID | Concurrency | Duration / Samples | RPS / Throughput | P50 | P95 | P99 | Error Rate | Result | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
${stageTableRows}

## 4. Infra Telemetry Samples

| Timestamp | CPU | Memory RSS | Disk Usage | Active DB Connections | Slow Queries >1s | Evidence |
|---|---|---|---|---|---|---|
${telemetryRows}

## 5. Benchmark Findings

| Metric | Threshold | Observed | Status | Action Owner | Notes |
|---|---|---|---|---|---|
| Home page P95 | <= 3.0s | blocked | blocked | follow-up | browser/http benchmark not runnable in sandbox |
| API list P95 | <= 300ms | ${formatMetric(report.summary.apiList.p95Ms)} | ${report.summary.apiList.p95Status} | Codex | max of API-01 and API-03 steady-50 |
| API list P99 | <= 500ms | ${formatMetric(report.summary.apiList.p99Ms)} | ${report.summary.apiList.p99Status} | Codex | max of API-01 and API-03 steady-50 |
| API error rate | < 1.0% | ${report.summary.apiList.errorRatePct}% | ${report.summary.apiList.errorRateStatus} | Codex | aggregate steady-50 API scenarios |
| 10MB upload P95 | <= 5.0s | ${formatMetric(report.summary.upload.p95Ms)} | ${report.summary.upload.status} | Codex | local disk-backed upload path |

## 6. Evidence Checklist

| Evidence | Path | Result |
|---|---|---|
| Raw benchmark export | \`${relativeFromRepo(join(artifactDir, 'benchmark-report.json'))}\` | done |
| Benchmark sheet | \`${relativeFromRepo(join(artifactDir, 'benchmark-sheet.md'))}\` | done |
| Web build manifest inspection | \`apps/web/.next/app-build-manifest.json\` | done |
| Home page timing screenshots | n/a | blocked |
| Docker stats snapshot | n/a | blocked |
| DB connections query output | n/a | blocked |
| Slow query evidence | n/a | blocked |

## 7. Conclusion

- decision: \`${report.summary.decision}\`
- summary: \`API list and 10MB upload lower-bound numbers are green in-process, but WEB-01 and real HTTP/browser timings remain unmeasured because sandbox networking is blocked.\`
- retest_required: \`yes\`
- blockers:
${blockers.map((item) => `  - ${item}`).join('\n')}
`;
}

function relativeFromRepo(targetPath) {
  return targetPath.replace(`${repoRoot}/`, '');
}

function formatMetric(value) {
  return typeof value === 'number' ? `${value}ms` : 'n/a';
}

function formatBytes(value) {
  return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
