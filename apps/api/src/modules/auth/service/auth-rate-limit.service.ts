import { Injectable } from '@nestjs/common';
import { RedisKvService } from './redis-kv.service';

interface RateLimitState {
  count: number;
  resetAtMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

@Injectable()
export class AuthRateLimitService {
  private readonly state = new Map<string, RateLimitState>();

  constructor(private readonly redisKvService: RedisKvService) {}

  async consume(scope: string, actorKey: string, limit: number, windowSeconds: number): Promise<RateLimitDecision> {
    const key = this.buildKey(scope, actorKey);
    const client = await this.redisKvService.getClient();

    if (client) {
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, windowSeconds);
      }

      const ttlSeconds = Math.max(0, await client.ttl?.(key) ?? windowSeconds);
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        retryAfterSeconds: ttlSeconds,
      };
    }

    const now = Date.now();
    const existing = this.state.get(key);
    const active = existing && existing.resetAtMs > now
      ? existing
      : { count: 0, resetAtMs: now + windowSeconds * 1000 };

    active.count += 1;
    this.state.set(key, active);

    return {
      allowed: active.count <= limit,
      remaining: Math.max(0, limit - active.count),
      retryAfterSeconds: Math.max(0, Math.ceil((active.resetAtMs - now) / 1000)),
    };
  }

  async reset(scope: string, actorKey: string) {
    const key = this.buildKey(scope, actorKey);
    const client = await this.redisKvService.getClient();
    if (client) {
      await client.del(key);
      return;
    }

    this.state.delete(key);
  }

  private buildKey(scope: string, actorKey: string) {
    return `auth:rate-limit:${scope}:${actorKey}`;
  }
}
