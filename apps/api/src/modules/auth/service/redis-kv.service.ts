import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { loadOptionalModule } from '../../../shared/runtime/load-optional-module';

type RedisClientLike = {
  del(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  on?(event: string, listener: (...args: unknown[]) => void): unknown;
  ping?(): Promise<'PONG' | string>;
  quit(): Promise<'OK' | void>;
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<'OK' | null>;
  ttl?(key: string): Promise<number>;
};

type RedisCtor = new (url: string, options?: Record<string, unknown>) => RedisClientLike;

export interface RedisKvServiceOptions {
  loadModule?: typeof loadOptionalModule;
}

@Injectable()
export class RedisKvService implements OnModuleDestroy {
  private clientPromise?: Promise<RedisClientLike | null>;

  constructor(private readonly options: RedisKvServiceOptions = {}) {}

  async getClient(): Promise<RedisClientLike | null> {
    if (!this.clientPromise) {
      this.clientPromise = this.createClient();
    }
    return this.clientPromise;
  }

  async onModuleDestroy() {
    const client = this.clientPromise ? await this.clientPromise : null;
    await client?.quit();
  }

  private async createClient(): Promise<RedisClientLike | null> {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) {
      return null;
    }

    const redisModule = await (this.options.loadModule ?? loadOptionalModule)<{ default?: RedisCtor }>('ioredis');
    const Redis = redisModule?.default;
    if (!Redis) {
      return null;
    }

    let client: RedisClientLike | null = null;
    try {
      client = new Redis(redisUrl, {
        lazyConnect: false,
        maxRetriesPerRequest: 1,
      });
      client.on?.('error', () => undefined);
      await client.ping?.();
      return client;
    } catch {
      await client?.quit().catch(() => undefined);
      return null;
    }
  }
}
