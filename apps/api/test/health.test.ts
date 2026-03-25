import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalObjectStorageAdapter } from '../src/modules/files/adapter/local-object-storage.adapter';
import { MockObjectStorageAdapter } from '../src/modules/files/adapter/mock-object-storage.adapter';
import { HealthService } from '../src/modules/health/health.service';

test('health service liveness returns status, version, and uptime', async () => {
  const service = new HealthService(new MockObjectStorageAdapter());
  const result = await service.getLiveness();

  assert.equal(result.status, 'ok');
  assert.equal(typeof result.version, 'string');
  assert.equal(typeof result.uptime, 'number');
});

test('health readiness reports ok when optional deps are unconfigured and local storage is writable', async () => {
  const previous = {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
  };

  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;
  delete process.env.S3_ENDPOINT;

  try {
    const service = new HealthService(new LocalObjectStorageAdapter());
    const readiness = await service.getReadiness();

    assert.equal(readiness.status, 'ok');
    assert.equal(readiness.statusCode, 200);
    assert.equal(readiness.checks.db.state, 'skipped');
    assert.equal(readiness.checks.redis.state, 'skipped');
    assert.equal(readiness.checks.storage.state, 'ready');
  } finally {
    Object.assign(process.env, previous);
  }
});
