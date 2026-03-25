import test from 'node:test';
import assert from 'node:assert/strict';
import { InternalServerErrorException } from '@nestjs/common';
import { normalizePage } from '../src/common/base-list-query.dto';
import { ApiHttpExceptionFilter } from '../src/common/http-exception.filter';
import { resolveDbPoolOptions } from '../src/db/client';
import { registerErrorTrackingHook } from '../src/observability/error-tracker';

test('pagination normalization caps pageSize at 100', () => {
  assert.deepEqual(normalizePage({ pageNo: -2, pageSize: 999 }), { pageNo: 1, pageSize: 100 });
  assert.deepEqual(normalizePage({ pageNo: 3, pageSize: 0 }), { pageNo: 3, pageSize: 20 });
});

test('db pool config keeps min 5 and max 20 with timeouts', () => {
  const previous = {
    DB_POOL_MIN: process.env.DB_POOL_MIN,
    DB_POOL_MAX: process.env.DB_POOL_MAX,
    DB_POOL_IDLE_TIMEOUT_MS: process.env.DB_POOL_IDLE_TIMEOUT_MS,
    DB_POOL_CONNECTION_TIMEOUT_MS: process.env.DB_POOL_CONNECTION_TIMEOUT_MS,
  };

  process.env.DB_POOL_MIN = '2';
  process.env.DB_POOL_MAX = '100';
  process.env.DB_POOL_IDLE_TIMEOUT_MS = '45000';
  process.env.DB_POOL_CONNECTION_TIMEOUT_MS = '3000';

  try {
    const options = resolveDbPoolOptions('postgresql://example.test/db');
    assert.equal(options.min, 5);
    assert.equal(options.max, 20);
    assert.equal(options.idleTimeoutMillis, 45_000);
    assert.equal(options.connectionTimeoutMillis, 3_000);
  } finally {
    Object.assign(process.env, previous);
  }
});

test('http exception filter emits requestId/timestamp shape and triggers tracking hook for 5xx', async () => {
  const previousTrackingEnabled = process.env.ERROR_TRACKING_ENABLED;
  process.env.ERROR_TRACKING_ENABLED = 'true';

  let captured: { exception: unknown; context: unknown } | null = null;
  registerErrorTrackingHook(async (exception, context) => {
    captured = { exception, context };
  });

  const filter = new ApiHttpExceptionFilter();
  const responseState: { statusCode?: number; body?: unknown } = {};
  const response = {
    status(code: number) {
      responseState.statusCode = code;
      return {
        json(body: unknown) {
          responseState.body = body;
        },
      };
    },
  };

  try {
    await filter.catch(
      new InternalServerErrorException('boom'),
      {
        switchToHttp: () => ({
          getResponse: () => response,
          getRequest: () => ({
            url: '/api/v1/example',
            method: 'GET',
            requestId: 'req-test-001',
            authUser: { id: 'user-123' },
          }),
        }),
      } as any,
    );

    assert.equal(responseState.statusCode, 500);
    assert.deepEqual(responseState.body, {
      code: 'SYS_500',
      message: 'boom',
      requestId: 'req-test-001',
      timestamp: (responseState.body as { timestamp: string }).timestamp,
    });
    assert.match((responseState.body as { timestamp: string }).timestamp, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(captured?.context, {
      code: 'SYS_500',
      message: 'boom',
      requestId: 'req-test-001',
      path: '/api/v1/example',
      method: 'GET',
      status: 500,
      userId: 'user-123',
    });
  } finally {
    registerErrorTrackingHook(null);
    if (previousTrackingEnabled === undefined) {
      delete process.env.ERROR_TRACKING_ENABLED;
    } else {
      process.env.ERROR_TRACKING_ENABLED = previousTrackingEnabled;
    }
  }
});
