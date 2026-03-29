import { Injectable } from '@nestjs/common';
import { SessionRecord } from '../auth.types';
import { RedisKvService } from './redis-kv.service';

interface CachedSessionEntry {
  expiresAtMs: number;
  session: SessionRecord;
}

@Injectable()
export class AuthSessionCacheService {
  private readonly accessSessionCache = new Map<string, CachedSessionEntry>();
  private readonly refreshSessionCache = new Map<string, CachedSessionEntry>();

  constructor(private readonly redisKvService: RedisKvService) {}

  async cache(session: SessionRecord) {
    await Promise.all([
      this.store('access', session.accessTokenId, session, new Date(session.accessExpiresAt)),
      this.store('refresh', session.refreshTokenId, session, new Date(session.refreshExpiresAt)),
    ]);
  }

  async evict(session: SessionRecord) {
    const client = await this.redisKvService.getClient();
    if (client) {
      await client.del(
        this.buildKey('access', session.accessTokenId),
        this.buildKey('refresh', session.refreshTokenId),
      );
    }

    this.accessSessionCache.delete(session.accessTokenId);
    this.refreshSessionCache.delete(session.refreshTokenId);
  }

  getByAccessTokenId(tokenId: string, now = new Date()) {
    return this.get('access', tokenId, now);
  }

  getByRefreshTokenId(tokenId: string, now = new Date()) {
    return this.get('refresh', tokenId, now);
  }

  private async get(kind: 'access' | 'refresh', tokenId: string, now: Date) {
    const client = await this.redisKvService.getClient();
    const key = this.buildKey(kind, tokenId);

    if (client) {
      const cached = await client.get(key);
      if (!cached) {
        return undefined;
      }

      const session = JSON.parse(cached) as SessionRecord;
      if (!this.isSessionActive(kind, session, now)) {
        await client.del(key);
        return undefined;
      }
      return session;
    }

    const cache = kind === 'access' ? this.accessSessionCache : this.refreshSessionCache;
    const entry = cache.get(tokenId);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAtMs <= now.getTime()) {
      cache.delete(tokenId);
      return undefined;
    }

    return entry.session;
  }

  private async store(kind: 'access' | 'refresh', tokenId: string, session: SessionRecord, expiresAt: Date) {
    const ttlSeconds = this.getTtlSeconds(expiresAt);
    if (ttlSeconds <= 0) {
      return;
    }

    const client = await this.redisKvService.getClient();
    const key = this.buildKey(kind, tokenId);
    if (client) {
      await client.set(key, JSON.stringify(session), 'EX', ttlSeconds);
      return;
    }

    const cache = kind === 'access' ? this.accessSessionCache : this.refreshSessionCache;
    cache.set(tokenId, {
      session,
      expiresAtMs: expiresAt.getTime(),
    });
  }

  private buildKey(kind: 'access' | 'refresh', tokenId: string) {
    return `auth:session:${kind}:${tokenId}`;
  }

  private getTtlSeconds(expiresAt: Date) {
    return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
  }

  private isSessionActive(kind: 'access' | 'refresh', session: SessionRecord, now: Date) {
    if (session.revokedAt) {
      return false;
    }

    const expiresAt = kind === 'access' ? session.accessExpiresAt : session.refreshExpiresAt;
    return new Date(expiresAt).getTime() > now.getTime();
  }
}
