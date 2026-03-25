import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { access, mkdir } from 'node:fs/promises';
import { Socket } from 'node:net';
import { resolve } from 'node:path';
import { URL } from 'node:url';
import { getDbPool } from '../../db/client';
import { LocalObjectStorageAdapter } from '../files/adapter/local-object-storage.adapter';
import { MockObjectStorageAdapter } from '../files/adapter/mock-object-storage.adapter';
import { OBJECT_STORAGE_ADAPTER, ObjectStorageAdapter } from '../files/adapter/object-storage.adapter';

type ReadinessState = 'ready' | 'error' | 'skipped';

export interface HealthCheckResult {
  state: ReadinessState;
  detail?: string;
}

@Injectable()
export class HealthService {
  async getLiveness() {
    return {
      status: 'ok',
      version: process.env.APP_VERSION ?? process.env.npm_package_version ?? '0.1.0',
      uptime: Number(process.uptime().toFixed(3)),
    };
  }

  constructor(
    @Inject(OBJECT_STORAGE_ADAPTER)
    private readonly objectStorageAdapter: ObjectStorageAdapter,
  ) {}

  async getReadiness() {
    const checks = {
      db: await this.checkDatabase(),
      redis: await this.checkRedis(),
      storage: await this.checkStorage(),
    };
    const hasFailure = Object.values(checks).some((item) => item.state === 'error');

    return {
      status: hasFailure ? 'error' : 'ok',
      statusCode: hasFailure ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK,
      version: process.env.APP_VERSION ?? process.env.npm_package_version ?? '0.1.0',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    if (!process.env.DATABASE_URL) {
      return { state: 'skipped', detail: 'DATABASE_URL is not configured' };
    }

    try {
      await getDbPool(process.env.DATABASE_URL).query('select 1');
      return { state: 'ready' };
    } catch (error) {
      return { state: 'error', detail: error instanceof Error ? error.message : 'database check failed' };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult> {
    if (!process.env.REDIS_URL) {
      return { state: 'skipped', detail: 'REDIS_URL is not configured' };
    }

    return this.checkTcpEndpoint(process.env.REDIS_URL, 'redis');
  }

  private async checkStorage(): Promise<HealthCheckResult> {
    if (this.objectStorageAdapter instanceof MockObjectStorageAdapter) {
      return { state: 'ready', detail: 'mock storage adapter enabled' };
    }

    if (this.objectStorageAdapter instanceof LocalObjectStorageAdapter) {
      const storageRoot = resolve(process.cwd(), '.data/object-storage');
      try {
        await mkdir(storageRoot, { recursive: true });
        await access(storageRoot);
        return { state: 'ready', detail: storageRoot };
      } catch (error) {
        return { state: 'error', detail: error instanceof Error ? error.message : 'local storage unavailable' };
      }
    }

    if (!process.env.S3_ENDPOINT) {
      return { state: 'skipped', detail: 'S3_ENDPOINT is not configured' };
    }

    return this.checkTcpEndpoint(process.env.S3_ENDPOINT, 's3');
  }

  private async checkTcpEndpoint(rawUrl: string, serviceName: string): Promise<HealthCheckResult> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return { state: 'error', detail: `${serviceName} URL is invalid` };
    }

    const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;

    try {
      await new Promise<void>((resolveCheck, reject) => {
        const socket = new Socket();
        const timeoutMs = 2_000;
        const cleanup = () => {
          socket.removeAllListeners();
          socket.destroy();
        };

        socket.setTimeout(timeoutMs);
        socket.once('connect', () => {
          cleanup();
          resolveCheck();
        });
        socket.once('timeout', () => {
          cleanup();
          reject(new Error(`${serviceName} connection timed out`));
        });
        socket.once('error', (error) => {
          cleanup();
          reject(error);
        });
        socket.connect(port, parsed.hostname);
      });

      return { state: 'ready' };
    } catch (error) {
      return { state: 'error', detail: error instanceof Error ? error.message : `${serviceName} unavailable` };
    }
  }
}
