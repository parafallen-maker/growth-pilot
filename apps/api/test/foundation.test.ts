import test from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { DefaultAuthSessionRepository } from '../src/modules/auth/repository/auth-session.repository';
import { AuthRateLimitService } from '../src/modules/auth/service/auth-rate-limit.service';
import { AuthSessionCacheService } from '../src/modules/auth/service/auth-session-cache.service';
import { RedisKvService } from '../src/modules/auth/service/redis-kv.service';
import { AuthService } from '../src/modules/auth/service/auth.service';
import { BullmqJobBroker } from '../src/modules/jobs/queue/bullmq-job-broker';
import { JobsRepository } from '../src/modules/jobs/repository/jobs.repository';
import { JobsService } from '../src/modules/jobs/service/jobs.service';
import { SettingsRepository } from '../src/modules/settings/repository/settings.repository';
import { SettingsService } from '../src/modules/settings/service/settings.service';
import { UsersRepository } from '../src/modules/users/repository/users.repository';
import { UsersService } from '../src/modules/users/service/users.service';

function resetPersistence() {
  rmSync('.data/auth-sessions.json', { force: true });
  rmSync('.data/jobs.json', { force: true });
  rmSync('.data/users.json', { force: true });
  rmSync('.data/settings.json', { force: true });
}

function createFixture() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'growthpilot-test-secret-with-32-chars!';
  resetPersistence();
  const usersRepository = new UsersRepository();
  const usersService = new UsersService(usersRepository);
  const redisKvService = new RedisKvService();
  const authService = new AuthService(
    usersService,
    new DefaultAuthSessionRepository(),
    new AuthSessionCacheService(redisKvService),
    new AuthRateLimitService(redisKvService),
  );
  const settingsService = new SettingsService(new SettingsRepository());
  const jobsService = new JobsService(new JobsRepository());

  return {
    usersService,
    authService,
    settingsService,
    jobsService,
  };
}

test('auth login -> current user -> refresh rotation -> logout closes session', async () => {
  const { authService } = createFixture();

  const loginResult = await authService.login('admin', 'admin123');
  assert.ok(loginResult.accessToken.split('.').length === 3);
  assert.ok(loginResult.refreshToken.split('.').length === 3);
  assert.equal(loginResult.user.username, 'admin');

  const currentUser = await authService.currentUser(loginResult.accessToken);
  assert.deepEqual(currentUser.roles, ['admin']);
  assert.ok(currentUser.permissions.includes('jobs.read'));
  assert.ok(currentUser.permissions.includes('users.role.bind'));

  const refreshResult = await authService.refresh(loginResult.refreshToken);
  assert.ok(refreshResult.accessToken.split('.').length === 3);
  assert.ok(refreshResult.refreshToken.split('.').length === 3);
  assert.notEqual(refreshResult.refreshToken, loginResult.refreshToken);
  await assert.rejects(() => authService.currentUser(loginResult.accessToken));
  await assert.rejects(() => authService.refresh(loginResult.refreshToken));

  await authService.logout(refreshResult.accessToken, refreshResult.refreshToken);
  await assert.rejects(() => authService.currentUser(refreshResult.accessToken));
  await assert.rejects(() => authService.refresh(refreshResult.refreshToken));
});

test('settings queries return filtered mock data aligned with list shape', async () => {
  const { settingsService } = createFixture();

  const campuses = await settingsService.listCampuses();
  assert.equal(campuses.list.length, 2);
  assert.equal(campuses.page.total, 2);

  const terms = await settingsService.listTerms('campus-guanshanhu');
  assert.equal(terms.list.length, 1);
  assert.equal(terms.list[0]?.campusId, 'campus-guanshanhu');

  const dictionaries = await settingsService.listDictionaries('job_status');
  assert.equal(dictionaries.list.length, 2);
  assert.equal(dictionaries.list[0]?.dictType, 'job_status');
});

test('jobs and user role assignment skeleton are available', async () => {
  const { jobsService, usersService } = createFixture();

  const job = jobsService.getJob('job-homework-analysis-001');
  assert.equal(job.status, 'running');
  assert.equal(job.jobId, 'job-homework-analysis-001');

  const listed = jobsService.listJobs({ status: 'running' });
  assert.equal(listed.list.length, 1);

  await usersService.assignRoles('user-teacher-001', ['admin']);
  const after = await usersService.getCurrentUserProfile('user-teacher-001');
  assert.deepEqual(after.roles, ['admin']);
  assert.ok(after.permissions.includes('jobs.read'));
});

test('auth login rate limiting falls back to in-memory counters when Redis is unavailable', async () => {
  const originalMax = process.env.AUTH_LOGIN_RATE_LIMIT_MAX;
  const originalWindow = process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS;
  const originalRedisUrl = process.env.REDIS_URL;

  process.env.AUTH_LOGIN_RATE_LIMIT_MAX = '1';
  process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS = '60';
  delete process.env.REDIS_URL;

  try {
    const { authService } = createFixture();

    await assert.rejects(() => authService.login('admin', 'wrong-password'));
    await assert.rejects(
      () => authService.login('admin', 'wrong-password'),
      (error: unknown) => typeof (error as { getStatus?: () => number })?.getStatus === 'function'
        && (error as { getStatus(): number }).getStatus() === 429,
    );
  } finally {
    if (originalMax === undefined) {
      delete process.env.AUTH_LOGIN_RATE_LIMIT_MAX;
    } else {
      process.env.AUTH_LOGIN_RATE_LIMIT_MAX = originalMax;
    }

    if (originalWindow === undefined) {
      delete process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS;
    } else {
      process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS = originalWindow;
    }

    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
  }
});

test('bullmq broker stays inert when queue driver is inline', async () => {
  const originalDriver = process.env.JOB_QUEUE_DRIVER;
  process.env.JOB_QUEUE_DRIVER = 'inline';

  try {
    const broker = new BullmqJobBroker();
    assert.equal(await broker.enqueue('homework-analysis', 'execute', 'job-001', { jobId: 'job-001' }), false);
    assert.equal(await broker.registerWorker('homework-analysis', async () => undefined), false);
    await broker.onModuleDestroy();
  } finally {
    if (originalDriver === undefined) {
      delete process.env.JOB_QUEUE_DRIVER;
    } else {
      process.env.JOB_QUEUE_DRIVER = originalDriver;
    }
  }
});
