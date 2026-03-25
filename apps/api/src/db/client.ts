import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const DEFAULT_DB_POOL_MIN = 5;
const DEFAULT_DB_POOL_MAX = 20;
const DEFAULT_DB_IDLE_TIMEOUT_MS = 30_000;
const DEFAULT_DB_CONNECTION_TIMEOUT_MS = 10_000;
const poolCache = new Map<string, Pool>();

function clampInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

export function resolveDbPoolOptions(connectionString: string) {
  const min = clampInteger(process.env.DB_POOL_MIN, DEFAULT_DB_POOL_MIN, DEFAULT_DB_POOL_MIN, DEFAULT_DB_POOL_MAX);
  const max = clampInteger(process.env.DB_POOL_MAX, DEFAULT_DB_POOL_MAX, Math.max(min, DEFAULT_DB_POOL_MIN), DEFAULT_DB_POOL_MAX);
  return {
    connectionString,
    min,
    max,
    idleTimeoutMillis: clampInteger(process.env.DB_POOL_IDLE_TIMEOUT_MS, DEFAULT_DB_IDLE_TIMEOUT_MS, 1_000, 300_000),
    connectionTimeoutMillis: clampInteger(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, DEFAULT_DB_CONNECTION_TIMEOUT_MS, 500, 120_000),
  };
}

export function getDbPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const existing = poolCache.get(connectionString);
  if (existing) {
    return existing;
  }

  const pool = new Pool(resolveDbPoolOptions(connectionString));
  poolCache.set(connectionString, pool);
  return pool;
}

export function createDb(connectionString = process.env.DATABASE_URL) {
  const pool = getDbPool(connectionString);
  return drizzle({ client: pool, schema });
}

export type GrowthPilotDb = ReturnType<typeof createDb>;
