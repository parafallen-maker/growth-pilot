import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SessionRecord } from '../src/modules/auth/auth.types';
import { AuthRateLimitService } from '../src/modules/auth/service/auth-rate-limit.service';
import { AuthSessionCacheService } from '../src/modules/auth/service/auth-session-cache.service';
import { RedisKvService } from '../src/modules/auth/service/redis-kv.service';
import { MockObjectStorageAdapter } from '../src/modules/files/adapter/mock-object-storage.adapter';
import { S3ObjectStorageAdapter } from '../src/modules/files/adapter/s3-object-storage.adapter';
import { FileAssetRepository } from '../src/modules/files/repository/file-asset.repository';
import { FilesService } from '../src/modules/files/service/files.service';
import { GrowthReportDraftJobPayload, HomeworkAnalysisJobPayload } from '../src/modules/jobs/queue/job-queue.types';
import { GROWTH_REPORT_DRAFT_QUEUE, HOMEWORK_ANALYSIS_QUEUE } from '../src/modules/jobs/queue/job-queue.constants';
import { BullmqJobBroker } from '../src/modules/jobs/queue/bullmq-job-broker';
import { JobsRepository } from '../src/modules/jobs/repository/jobs.repository';
import { JobsService } from '../src/modules/jobs/service/jobs.service';
import { ReportDraftJob } from '../src/modules/growth/job/report-draft.job';
import { ReportMaterialAssembler } from '../src/modules/growth/job/report-material-assembler';
import { GrowthRepository } from '../src/modules/growth/repository/growth.repository';
import { GrowthService } from '../src/modules/growth/service/growth.service';
import { MockHomeworkAnalysisAdapter } from '../src/modules/homework/adapter/mock-homework-analysis.adapter';
import { HomeworkEventPublisher } from '../src/modules/homework/event/homework-event.publisher';
import { HomeworkAnalysisQueue } from '../src/modules/homework/job/homework-analysis.queue';
import { HomeworkRepository } from '../src/modules/homework/repository/homework.repository';
import { HomeworkService } from '../src/modules/homework/service/homework.service';

const dataDir = resolve(process.cwd(), '.data');

function resetDataDir() {
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(resolve(dataDir, '.gitkeep'), '');
}

async function withEnv<T>(patch: Record<string, string | undefined>, run: () => Promise<T>) {
  const previousEntries = Object.entries(patch).map(([key, value]) => [key, process.env[key], value] as const);
  for (const [key, , nextValue] of previousEntries) {
    if (nextValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = nextValue;
    }
  }

  try {
    return await run();
  } finally {
    for (const [key, previousValue] of previousEntries) {
      if (previousValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousValue;
      }
    }
  }
}

class FakeRedisClient {
  readonly store = new Map<string, { value: string; expiresAtMs: number | null }>();
  errorListenerCount = 0;
  quitCalls = 0;

  constructor(
    readonly url: string,
    readonly options?: Record<string, unknown>,
    private readonly pingFailure?: Error,
  ) {}

  async del(...keys: string[]) {
    let deleted = 0;
    for (const key of keys) {
      this.purgeExpired(key);
      if (this.store.delete(key)) {
        deleted += 1;
      }
    }
    return deleted;
  }

  async expire(key: string, seconds: number) {
    this.purgeExpired(key);
    const current = this.store.get(key);
    if (!current) {
      return 0;
    }

    current.expiresAtMs = Date.now() + seconds * 1000;
    return 1;
  }

  async get(key: string) {
    this.purgeExpired(key);
    return this.store.get(key)?.value ?? null;
  }

  async incr(key: string) {
    this.purgeExpired(key);
    const current = this.store.get(key);
    const next = (current ? Number(current.value) : 0) + 1;
    this.store.set(key, {
      value: String(next),
      expiresAtMs: current?.expiresAtMs ?? null,
    });
    return next;
  }

  on(event: string, _listener: (...args: unknown[]) => void) {
    if (event === 'error') {
      this.errorListenerCount += 1;
    }
    return this;
  }

  async ping() {
    if (this.pingFailure) {
      throw this.pingFailure;
    }

    return 'PONG';
  }

  async quit() {
    this.quitCalls += 1;
    return 'OK' as const;
  }

  async set(key: string, value: string, _mode: 'EX', ttlSeconds: number) {
    this.store.set(key, {
      value,
      expiresAtMs: Date.now() + ttlSeconds * 1000,
    });
    return 'OK' as const;
  }

  async ttl(key: string) {
    this.purgeExpired(key);
    const current = this.store.get(key);
    if (!current) {
      return -2;
    }
    if (current.expiresAtMs == null) {
      return -1;
    }
    return Math.max(0, Math.ceil((current.expiresAtMs - Date.now()) / 1000));
  }

  private purgeExpired(key: string) {
    const current = this.store.get(key);
    if (current?.expiresAtMs != null && current.expiresAtMs <= Date.now()) {
      this.store.delete(key);
    }
  }
}

function createRedisModuleLoader(options?: { pingFailure?: Error }) {
  const clients: FakeRedisClient[] = [];
  const Redis = class FakeRedisCtor {
    constructor(url: string, config?: Record<string, unknown>) {
      const client = new FakeRedisClient(url, config, options?.pingFailure);
      clients.push(client);
      return client;
    }
  };

  return {
    clients,
    loadModule: (async (specifier: string) => {
      if (specifier === 'ioredis') {
        return { default: Redis };
      }
      return null;
    }) as any,
  };
}

function createBullmqRuntimeLoader() {
  const processors = new Map<string, Array<(job: { data: unknown }) => Promise<unknown>>>();
  const events = {
    adds: [] as Array<{
      queueName: string;
      jobName: string;
      jobId: string;
      data: object;
      removeOnComplete: number;
      removeOnFail: number;
      defaultRemoveOnComplete: number;
      defaultRemoveOnFail: number;
    }>,
    queueConstructions: [] as Array<{ queueName: string; defaultJobOptions: { removeOnComplete: number; removeOnFail: number } }>,
    workerConstructions: [] as Array<{ queueName: string; concurrency: number }>,
    closedQueues: 0,
    closedWorkers: 0,
    connections: [] as FakeRedisClient[],
  };

  const Redis = class FakeBullmqRedisCtor {
    constructor(url: string, config?: Record<string, unknown>) {
      const client = new FakeRedisClient(url, config);
      events.connections.push(client);
      return client;
    }
  };

  class Queue {
    constructor(
      readonly name: string,
      readonly options: {
        connection: unknown;
        defaultJobOptions: { removeOnComplete: number; removeOnFail: number };
      },
    ) {
      events.queueConstructions.push({
        queueName: name,
        defaultJobOptions: options.defaultJobOptions,
      });
    }

    async add(
      jobName: string,
      data: object,
      options: { jobId: string; removeOnComplete: number; removeOnFail: number },
    ) {
      events.adds.push({
        queueName: this.name,
        jobName,
        jobId: options.jobId,
        data,
        removeOnComplete: options.removeOnComplete,
        removeOnFail: options.removeOnFail,
        defaultRemoveOnComplete: this.options.defaultJobOptions.removeOnComplete,
        defaultRemoveOnFail: this.options.defaultJobOptions.removeOnFail,
      });

      const queueProcessors = processors.get(this.name) ?? [];
      await Promise.all(queueProcessors.map((processor) => processor({ data })));
      return { jobId: options.jobId };
    }

    async close() {
      events.closedQueues += 1;
    }
  }

  class Worker {
    constructor(
      readonly name: string,
      readonly processor: (job: { data: unknown }) => Promise<unknown>,
      readonly options: { connection: unknown; concurrency: number },
    ) {
      events.workerConstructions.push({
        queueName: name,
        concurrency: options.concurrency,
      });
      const queueProcessors = processors.get(name) ?? [];
      queueProcessors.push(processor);
      processors.set(name, queueProcessors);
    }

    async close() {
      events.closedWorkers += 1;
    }
  }

  return {
    events,
    loadModule: (async (specifier: string) => {
      if (specifier === 'bullmq') {
        return { Queue, Worker };
      }
      if (specifier === 'ioredis') {
        return { default: Redis };
      }
      return null;
    }) as any,
  };
}

function createS3ModuleLoader() {
  const sentCommands: Array<{ input: Record<string, unknown> }> = [];
  const signedUrlCalls: Array<{ input: Record<string, unknown>; expiresIn: number }> = [];
  const clientConfigs: Record<string, unknown>[] = [];

  class FakeS3Client {
    constructor(config: Record<string, unknown>) {
      clientConfigs.push(config);
    }

    async send(command: { input: Record<string, unknown> }) {
      sentCommands.push(command);
      return { ETag: '"etag-from-fake-s3"' };
    }
  }

  class FakePutObjectCommand {
    constructor(readonly input: Record<string, unknown>) {}
  }

  class FakeGetObjectCommand {
    constructor(readonly input: Record<string, unknown>) {}
  }

  return {
    clientConfigs,
    sentCommands,
    signedUrlCalls,
    loadModule: (async (specifier: string) => {
      if (specifier === '@aws-sdk/client-s3') {
        return {
          S3Client: FakeS3Client,
          PutObjectCommand: FakePutObjectCommand,
          GetObjectCommand: FakeGetObjectCommand,
        };
      }
      if (specifier === '@aws-sdk/s3-request-presigner') {
        return {
          getSignedUrl: async (_client: unknown, command: { input: Record<string, unknown> }, options: { expiresIn: number }) => {
            signedUrlCalls.push({
              input: command.input,
              expiresIn: options.expiresIn,
            });
            return `https://signed.example/${command.input.Bucket}/${command.input.Key}?ttl=${options.expiresIn}`;
          },
        };
      }
      return null;
    }) as any,
  };
}

test('BE-23 redis client probe falls back cleanly when configured Redis is unreachable', async () => {
  const redisRuntime = createRedisModuleLoader({ pingFailure: new Error('redis down') });

  await withEnv({ REDIS_URL: 'redis://127.0.0.1:6379' }, async () => {
    const redisKvService = new RedisKvService({
      loadModule: redisRuntime.loadModule as never,
    });

    assert.equal(await redisKvService.getClient(), null);
    assert.equal(redisRuntime.clients.length, 1);
    assert.equal(redisRuntime.clients[0]?.errorListenerCount, 1);
    assert.equal(redisRuntime.clients[0]?.quitCalls, 1);
  });
});

test('BE-23 auth session cache and rate limit use Redis-compatible storage when available', async () => {
  const redisRuntime = createRedisModuleLoader();

  await withEnv({ REDIS_URL: 'redis://127.0.0.1:6379' }, async () => {
    const redisKvService = new RedisKvService({
      loadModule: redisRuntime.loadModule as never,
    });
    const authSessionCacheService = new AuthSessionCacheService(redisKvService);
    const authRateLimitService = new AuthRateLimitService(redisKvService);

    const session: SessionRecord = {
      sessionId: 'session-001',
      userId: 'user-001',
      accessTokenId: 'access-001',
      refreshTokenId: 'refresh-001',
      accessToken: 'hashed-access-token',
      refreshToken: 'hashed-refresh-token',
      accessExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      createdAt: new Date().toISOString(),
      rotatedAt: null,
      revokedAt: null,
    };

    await authSessionCacheService.cache(session);
    assert.equal(redisRuntime.clients[0]?.errorListenerCount, 1);
    assert.deepEqual(await authSessionCacheService.getByAccessTokenId(session.accessTokenId), session);
    assert.deepEqual(await authSessionCacheService.getByRefreshTokenId(session.refreshTokenId), session);

    const first = await authRateLimitService.consume('login', 'admin:127.0.0.1', 2, 60);
    const second = await authRateLimitService.consume('login', 'admin:127.0.0.1', 2, 60);
    const third = await authRateLimitService.consume('login', 'admin:127.0.0.1', 2, 60);
    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, false);
    assert.match(String(third.retryAfterSeconds), /^[0-9]+$/);

    await authRateLimitService.reset('login', 'admin:127.0.0.1');
    const afterReset = await authRateLimitService.consume('login', 'admin:127.0.0.1', 2, 60);
    assert.equal(afterReset.allowed, true);
    assert.equal(afterReset.remaining, 1);

    await authSessionCacheService.evict(session);
    assert.equal(await authSessionCacheService.getByAccessTokenId(session.accessTokenId), undefined);
    assert.equal(await authSessionCacheService.getByRefreshTokenId(session.refreshTokenId), undefined);

    await redisKvService.onModuleDestroy();
    assert.equal(redisRuntime.clients.length, 1);
    assert.equal(redisRuntime.clients[0]?.quitCalls, 1);
  });
});

test('BE-24 BullMQ broker drives homework analysis and growth report jobs through registered workers', async () => {
  resetDataDir();
  const bullmqRuntime = createBullmqRuntimeLoader();

  await withEnv({
    JOB_QUEUE_DRIVER: 'bullmq',
    JOB_QUEUE_WORKER_CONCURRENCY: '4',
    JOB_QUEUE_REMOVE_ON_COMPLETE: '7',
    JOB_QUEUE_REMOVE_ON_FAIL: '9',
    REDIS_URL: 'redis://127.0.0.1:6379',
  }, async () => {
    const broker = new BullmqJobBroker({
      loadModule: bullmqRuntime.loadModule as never,
    });
    const jobsService = new JobsService(new JobsRepository());
    const filesService = new FilesService(new FileAssetRepository(), new MockObjectStorageAdapter());
    const homeworkRepository = new HomeworkRepository();
    const homeworkEventPublisher = new HomeworkEventPublisher(homeworkRepository);
    const homeworkAnalysisQueue = new HomeworkAnalysisQueue(
      jobsService,
      homeworkRepository,
      filesService,
      new MockHomeworkAnalysisAdapter(),
      broker,
    );
    const homeworkService = new HomeworkService(
      homeworkRepository,
      homeworkAnalysisQueue,
      homeworkEventPublisher,
      filesService,
      jobsService,
    );

    const growthRepository = new GrowthRepository();
    const reportDraftJob = new ReportDraftJob(
      growthRepository,
      new ReportMaterialAssembler(growthRepository),
      jobsService,
      broker,
    );
    const growthService = new GrowthService(growthRepository, reportDraftJob);

    await broker.registerWorker(HOMEWORK_ANALYSIS_QUEUE, async (data) => {
      await homeworkAnalysisQueue.executeQueuedJob(data as HomeworkAnalysisJobPayload);
    });
    await broker.registerWorker(GROWTH_REPORT_DRAFT_QUEUE, async (data) => {
      await reportDraftJob.executeQueuedJob(data as GrowthReportDraftJobPayload);
    });

    const uploaded = await filesService.uploadOne({
      fileName: 'queued-homework.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 128,
      purpose: 'homework',
      uploadedBy: 'teacher-001',
      contentBase64: Buffer.from('queued-homework').toString('base64'),
    });
    const submission = await homeworkService.createSubmission({
      studentId: 'student-001',
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      teacherId: 'teacher-001',
      subject: 'math',
      homeworkDate: '2026-03-25',
      fileIds: [uploaded.fileId],
    });

    const homeworkJob = await homeworkService.triggerAnalysis(submission.id, {
      provider: 'doubao',
      modelName: 'vision-v1',
      promptVersion: 'homework-review-v3',
    });
    assert.equal(homeworkJob.status, 'success');
    assert.equal(jobsService.getJob(homeworkJob.jobId).status, 'success');
    assert.equal((await homeworkRepository.getSubmissionOrThrow(submission.id)).aiStatus, 'ready');

    const growthJob = await growthService.generateReportDraft({
      reportType: 'weekly',
      periodKey: '2026-W13',
      studentIds: ['student-001'],
      termId: 'term-2026-spring',
    });
    assert.equal(jobsService.getJob(growthJob.jobId).status, 'success');
    assert.equal((await growthService.getReportDetail('report-student-001-2026-W13')).report.generatedByJobId, growthJob.jobId);

    assert.equal(bullmqRuntime.events.workerConstructions.length, 2);
    assert.deepEqual(
      bullmqRuntime.events.workerConstructions.map((item) => item.concurrency),
      [4, 4],
    );
    assert.equal(
      bullmqRuntime.events.adds.every((item) =>
        item.removeOnComplete === 7
        && item.removeOnFail === 9
        && item.defaultRemoveOnComplete === 7
        && item.defaultRemoveOnFail === 9),
      true,
    );

    await broker.onModuleDestroy();
    assert.equal(bullmqRuntime.events.closedWorkers, 2);
    assert.equal(bullmqRuntime.events.closedQueues, 2);
    assert.equal(bullmqRuntime.events.connections.length >= 4, true);
  });
});

test('BE-25 S3 adapter persists file assets and resolves signed URLs through the injected SDK runtime', async () => {
  resetDataDir();
  const s3Runtime = createS3ModuleLoader();

  await withEnv({
    S3_ENDPOINT: 'http://minio.local:9000',
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY: 'minioadmin',
    S3_SECRET_KEY: 'minioadmin',
    S3_BUCKET: 'growthpilot-dev',
    S3_FORCE_PATH_STYLE: 'true',
    S3_SIGNED_URL_TTL_SECONDS: '321',
    S3_PUBLIC_BASE_URL: undefined,
  }, async () => {
    const adapter = new S3ObjectStorageAdapter({
      loadModule: s3Runtime.loadModule as never,
    });
    const filesService = new FilesService(new FileAssetRepository(), adapter);

    const uploaded = await filesService.uploadMultipartFile({
      fileName: 'report.pdf',
      mimeType: 'application/pdf',
      content: Buffer.from('pdf-binary'),
      uploadedBy: 'teacher-001',
      purpose: 'growth-report',
    });

    assert.equal(uploaded.storageProvider, 'aws-s3-sdk');
    assert.match(uploaded.url, /^https:\/\/signed\.example\/growthpilot-dev\/growth-report\//);

    const detail = await filesService.getFileAsset(uploaded.fileId);
    assert.equal(detail.uploadedBy, 'teacher-001');

    assert.equal(s3Runtime.clientConfigs.length, 1);
    assert.equal((s3Runtime.clientConfigs[0] as any)?.endpoint, 'http://minio.local:9000');
    assert.equal((s3Runtime.clientConfigs[0] as any)?.forcePathStyle, true);
    assert.equal(s3Runtime.sentCommands.length, 1);
    assert.equal((s3Runtime.sentCommands[0]?.input as any)?.Bucket, 'growthpilot-dev');
    assert.equal((s3Runtime.sentCommands[0]?.input as any)?.ContentLength, Buffer.from('pdf-binary').byteLength);
    assert.equal(((s3Runtime.sentCommands[0]?.input as any)?.Metadata)?.filename, 'report.pdf');
    assert.equal(s3Runtime.signedUrlCalls.length, 3);
    assert.equal(s3Runtime.signedUrlCalls[0]?.expiresIn, 321);
  });
});
