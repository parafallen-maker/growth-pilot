import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { SessionRecord } from '../src/modules/auth/auth.types';
import { AuthRateLimitService } from '../src/modules/auth/service/auth-rate-limit.service';
import { AuthSessionCacheService } from '../src/modules/auth/service/auth-session-cache.service';
import { RedisKvService } from '../src/modules/auth/service/redis-kv.service';
import { MockObjectStorageAdapter } from '../src/modules/files/adapter/mock-object-storage.adapter';
import { S3ObjectStorageAdapter } from '../src/modules/files/adapter/s3-object-storage.adapter';
import { FileAssetRepository } from '../src/modules/files/repository/file-asset.repository';
import { FilesService } from '../src/modules/files/service/files.service';
import { ReportDraftJob } from '../src/modules/growth/job/report-draft.job';
import { ReportMaterialAssembler } from '../src/modules/growth/job/report-material-assembler';
import { GrowthRepository } from '../src/modules/growth/repository/growth.repository';
import { MockHomeworkAnalysisAdapter } from '../src/modules/homework/adapter/mock-homework-analysis.adapter';
import { HomeworkAnalysisQueue } from '../src/modules/homework/job/homework-analysis.queue';
import { HomeworkRepository } from '../src/modules/homework/repository/homework.repository';
import { BullmqJobBroker } from '../src/modules/jobs/queue/bullmq-job-broker';
import { GROWTH_REPORT_DRAFT_QUEUE, HOMEWORK_ANALYSIS_QUEUE } from '../src/modules/jobs/queue/job-queue.constants';
import { GrowthReportDraftJobPayload, HomeworkAnalysisJobPayload } from '../src/modules/jobs/queue/job-queue.types';
import { JobsRepository } from '../src/modules/jobs/repository/jobs.repository';
import { JobsService } from '../src/modules/jobs/service/jobs.service';

const dataDir = resolve(process.cwd(), '.data');

function resetDataDir() {
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(resolve(dataDir, '.gitkeep'), '');
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for live validation`);
  }
  return value;
}

async function waitFor<T>(
  description: string,
  read: () => Promise<T>,
  isDone: (value: T) => boolean,
  timeoutMs = 15_000,
) {
  const startedAt = Date.now();
  let lastValue: T | undefined;

  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await read();
    if (isDone(lastValue)) {
      return lastValue;
    }
    await delay(250);
  }

  throw new Error(`Timed out waiting for ${description}: ${JSON.stringify(lastValue)}`);
}

async function withTimeout<T>(description: string, promise: Promise<T>, timeoutMs = 5_000) {
  return await Promise.race([
    promise,
    delay(timeoutMs).then(() => {
      throw new Error(`Timed out waiting for ${description} after ${timeoutMs}ms`);
    }),
  ]);
}

async function requireRedisConnection() {
  const redisKvService = new RedisKvService();
  const client = await redisKvService.getClient();

  if (!client) {
    await redisKvService.onModuleDestroy();
    throw new Error('Expected RedisKvService to connect to a real Redis instance');
  }

  return { redisKvService, client };
}

async function validateBe23() {
  console.log('BE-23: validating Redis-backed session cache and auth rate limit');
  requireEnv('REDIS_URL');

  const { redisKvService } = await requireRedisConnection();
  const sessionCache = new AuthSessionCacheService(redisKvService);
  const rateLimit = new AuthRateLimitService(redisKvService);

  const session: SessionRecord = {
    sessionId: 'live-session-001',
    userId: 'user-admin-001',
    accessTokenId: 'live-access-001',
    refreshTokenId: 'live-refresh-001',
    accessToken: 'access-token-live',
    refreshToken: 'refresh-token-live',
    accessExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    rotatedAt: null,
    revokedAt: null,
  };

  try {
    await sessionCache.cache(session);
    assert.deepEqual(await sessionCache.getByAccessTokenId(session.accessTokenId), session);
    assert.deepEqual(await sessionCache.getByRefreshTokenId(session.refreshTokenId), session);

    const first = await rateLimit.consume('login', 'live-user@example.com', 2, 60);
    const second = await rateLimit.consume('login', 'live-user@example.com', 2, 60);
    const third = await rateLimit.consume('login', 'live-user@example.com', 2, 60);
    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, false);
    assert.ok(third.retryAfterSeconds > 0, 'Expected Redis TTL-based retryAfterSeconds');

    await rateLimit.reset('login', 'live-user@example.com');
    await sessionCache.evict(session);
    assert.equal(await sessionCache.getByAccessTokenId(session.accessTokenId), undefined);
  } finally {
    await redisKvService.onModuleDestroy();
  }
}

async function validateBe24() {
  console.log('BE-24: validating BullMQ queue and worker processing over Redis');
  requireEnv('REDIS_URL');
  process.env.JOB_QUEUE_DRIVER = 'bullmq';
  process.env.JOB_QUEUE_WORKER_CONCURRENCY ??= '1';

  const { redisKvService } = await requireRedisConnection();
  resetDataDir();

  const jobsRepository = new JobsRepository();
  const jobsService = new JobsService(jobsRepository);
  const broker = new BullmqJobBroker();
  const fileAssetRepository = new FileAssetRepository();
  const filesService = new FilesService(fileAssetRepository, new MockObjectStorageAdapter());
  const homeworkRepository = new HomeworkRepository();
  const growthRepository = new GrowthRepository();
  const homeworkAnalysisQueue = new HomeworkAnalysisQueue(
    jobsService,
    homeworkRepository,
    filesService,
    new MockHomeworkAnalysisAdapter(),
    broker,
  );
  const reportDraftJob = new ReportDraftJob(
    growthRepository,
    new ReportMaterialAssembler(growthRepository),
    jobsService,
    broker,
  );

  try {
    assert.equal(
      await broker.registerWorker(HOMEWORK_ANALYSIS_QUEUE, async (data) => {
        await homeworkAnalysisQueue.executeQueuedJob(data as HomeworkAnalysisJobPayload);
      }, 1),
      true,
    );
    assert.equal(
      await broker.registerWorker(GROWTH_REPORT_DRAFT_QUEUE, async (data) => {
        await reportDraftJob.executeQueuedJob(data as GrowthReportDraftJobPayload);
      }, 1),
      true,
    );

    const homeworkJob = await homeworkAnalysisQueue.enqueueAndProcess({
      submissionId: 'submission-001',
      provider: 'mock-ai',
      modelName: 'mock-model-live',
      promptVersion: 'live-v1',
      idempotencyKey: `live-homework-${Date.now()}`,
      force: true,
    });
    const homeworkResult = await waitFor(
      'homework analysis job success',
      async () => jobsService.getJob(homeworkJob.jobId),
      (job) => job.status === 'success',
    );
    assert.equal(homeworkResult.status, 'success');
    const savedAnalysis = await homeworkRepository.getLatestAnalysis('submission-001');
    assert.ok(savedAnalysis, 'Expected homework analysis to be persisted by the worker');

    const growthJob = await reportDraftJob.queue({
      reportType: 'weekly',
      periodKey: '2026-W13',
      studentIds: ['student-001'],
      termId: 'term-2026-spring',
    });
    const growthResult = await waitFor(
      'growth report draft job success',
      async () => jobsService.getJob(growthJob.jobId),
      (job) => job.status === 'success',
    );
    assert.equal(growthResult.status, 'success');
    const report = await growthRepository.findReportById('report-student-001-2026-W13');
    assert.ok(report, 'Expected growth report draft to be created by the worker');
  } finally {
    await broker.onModuleDestroy();
    await redisKvService.onModuleDestroy();
  }
}

async function ensureBucketExists(bucketName: string) {
  const { CreateBucketCommand, HeadBucketCommand, HeadObjectCommand, S3Client } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: process.env.S3_REGION ?? 'us-east-1',
    endpoint: requireEnv('S3_ENDPOINT'),
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') !== 'false',
    credentials: {
      accessKeyId: requireEnv('S3_ACCESS_KEY'),
      secretAccessKey: requireEnv('S3_SECRET_KEY'),
    },
  });

  try {
    await withTimeout(
      `HeadBucket ${bucketName}`,
      client.send(new HeadBucketCommand({ Bucket: bucketName })),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = typeof error === 'object' && error && '$metadata' in error
      ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      : undefined;
    const errorName = typeof error === 'object' && error && 'name' in error
      ? String((error as { name?: string }).name)
      : '';
    if (statusCode !== 404 && !/not.?found|no.?such.?bucket|does not exist/i.test(`${errorName} ${message}`)) {
      throw error;
    }
    await withTimeout(
      `CreateBucket ${bucketName}`,
      client.send(new CreateBucketCommand({ Bucket: bucketName })),
    );
    await withTimeout(
      `HeadBucket ${bucketName}`,
      client.send(new HeadBucketCommand({ Bucket: bucketName })),
    );
  }

  return { client, HeadObjectCommand };
}

async function validateBe25() {
  console.log('BE-25: validating S3/MinIO upload and file asset persistence');
  const bucketName = requireEnv('S3_BUCKET');
  const { client, HeadObjectCommand } = await ensureBucketExists(bucketName);

  resetDataDir();

  const filesService = new FilesService(new FileAssetRepository(), new S3ObjectStorageAdapter());
  const upload = await filesService.uploadMultipartFile({
    fileName: 'live-validation.pdf',
    mimeType: 'application/pdf',
    content: Buffer.from('%PDF-1.4\n% live validation\n', 'utf8'),
    bucketName,
    uploadedBy: 'user-admin-001',
    purpose: 'homework',
    sourceType: 'live_validation',
    metadata: {
      scenario: 'be25-live',
    },
  });

  assert.equal(upload.bucketName, bucketName);
  assert.equal(upload.storageProvider, 'aws-s3-sdk');
  assert.match(upload.url, /^https?:\/\//);

  const stored = await filesService.getFileAsset(upload.fileId);
  assert.equal(stored.objectKey, upload.objectKey);

  await withTimeout(
    `HeadObject ${upload.objectKey}`,
    client.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: upload.objectKey,
    })),
  );
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}

async function runValidation(name: string, validate: () => Promise<void>) {
  try {
    await validate();
    console.log(`${name}: live validation passed`);
    return null;
  } catch (error) {
    console.error(`${name}: live validation failed`);
    console.error(formatError(error));
    return { name, error };
  }
}

async function main() {
  process.env.JWT_SECRET ??= 'growthpilot-live-validation-secret-32ch';

  const failures: Array<{ name: string; error: unknown }> = [];
  for (const [name, validate] of [
    ['BE-23', validateBe23],
    ['BE-24', validateBe24],
    ['BE-25', validateBe25],
  ] as const) {
    const failure = await runValidation(name, validate);
    if (failure) {
      failures.push(failure);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Live validation failed for ${failures.map((failure) => failure.name).join(', ')}`);
  }

  console.log('Live validation for BE-23 through BE-25 completed successfully.');
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
