import { Injectable } from '@nestjs/common';
import { InferSelectModel, and, desc, eq, gt, isNull } from 'drizzle-orm';
import { createDb, dbSchema } from '../../../db';
import { FileJsonStore } from '../../../shared/persistence/file-json-store';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';
import { AuthSessionRepository, SessionRecord } from '../auth.types';

interface AuthStoreShape {
  sessions: SessionRecord[];
}

class FileAuthSessionRepository implements AuthSessionRepository {
  private readonly store = new FileJsonStore<AuthStoreShape>('.data/auth-sessions.json', () => ({ sessions: [] }));

  async save(session: SessionRecord) {
    this.store.update((state) => {
      state.sessions = [session, ...state.sessions.filter((item) => item.userId !== session.userId || item.revokedAt !== null)];
    });
    return session;
  }

  async revoke(sessionId: string, reason: 'logout' | 'rotated') {
    return this.store.update((state) => {
      const session = state.sessions.find((item) => item.sessionId === sessionId);
      if (!session || session.revokedAt) return undefined;
      session.revokedAt = new Date().toISOString();
      if (reason === 'rotated') {
        session.rotatedAt = session.revokedAt;
      }
      return session;
    });
  }

  async findActiveByAccessTokenId(tokenId: string, now = new Date()) {
    return this.store.read().sessions.find((item) => item.accessTokenId === tokenId && this.isActive(item, 'access', now));
  }

  async findActiveByRefreshTokenId(tokenId: string, now = new Date()) {
    return this.store.read().sessions.find((item) => item.refreshTokenId === tokenId && this.isActive(item, 'refresh', now));
  }

  private isActive(session: SessionRecord, kind: 'access' | 'refresh', now: Date) {
    const expiresAt = kind === 'access' ? session.accessExpiresAt : session.refreshExpiresAt;
    return !session.revokedAt && new Date(expiresAt).getTime() > now.getTime();
  }
}

class DbAuthSessionRepository implements AuthSessionRepository {
  private readonly db = createDb();

  async save(session: SessionRecord) {
    const now = new Date(session.createdAt);

    await this.db.transaction(async (tx) => {
      await tx
        .update(dbSchema.authSessions)
        .set({ revokedAt: now })
        .where(and(eq(dbSchema.authSessions.userId, session.userId), isNull(dbSchema.authSessions.revokedAt)));

      await tx.insert(dbSchema.authSessions).values({
        sessionId: session.sessionId,
        userId: session.userId,
        accessTokenId: session.accessTokenId,
        refreshTokenId: session.refreshTokenId,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        accessExpiresAt: new Date(session.accessExpiresAt),
        refreshExpiresAt: new Date(session.refreshExpiresAt),
        createdAt: now,
        rotatedAt: session.rotatedAt ? new Date(session.rotatedAt) : null,
        revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
      });
    });

    return session;
  }

  async revoke(sessionId: string, reason: 'logout' | 'rotated') {
    const revokedAt = new Date();
    const rotatedAt = reason === 'rotated' ? revokedAt : null;
    const rows = await this.db
      .update(dbSchema.authSessions)
      .set({ revokedAt, rotatedAt })
      .where(and(eq(dbSchema.authSessions.sessionId, sessionId), isNull(dbSchema.authSessions.revokedAt)))
      .returning();

    return this.mapRow(rows[0]);
  }

  async findActiveByAccessTokenId(tokenId: string, now = new Date()) {
    const rows = await this.db
      .select()
      .from(dbSchema.authSessions)
      .where(and(eq(dbSchema.authSessions.accessTokenId, tokenId), isNull(dbSchema.authSessions.revokedAt), gt(dbSchema.authSessions.accessExpiresAt, now)))
      .orderBy(desc(dbSchema.authSessions.createdAt))
      .limit(1);

    return this.mapRow(rows[0]);
  }

  async findActiveByRefreshTokenId(tokenId: string, now = new Date()) {
    const rows = await this.db
      .select()
      .from(dbSchema.authSessions)
      .where(and(eq(dbSchema.authSessions.refreshTokenId, tokenId), isNull(dbSchema.authSessions.revokedAt), gt(dbSchema.authSessions.refreshExpiresAt, now)))
      .orderBy(desc(dbSchema.authSessions.createdAt))
      .limit(1);

    return this.mapRow(rows[0]);
  }

  private mapRow(row: InferSelectModel<typeof dbSchema.authSessions> | undefined): SessionRecord | undefined {
    if (!row) return undefined;

    return {
      sessionId: row.sessionId,
      userId: row.userId,
      accessTokenId: row.accessTokenId,
      refreshTokenId: row.refreshTokenId,
      accessToken: row.accessToken,
      refreshToken: row.refreshToken,
      accessExpiresAt: row.accessExpiresAt.toISOString(),
      refreshExpiresAt: row.refreshExpiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      rotatedAt: row.rotatedAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
    };
  }
}

@Injectable()
export class DefaultAuthSessionRepository implements AuthSessionRepository {
  private readonly adapter: AuthSessionRepository;

  constructor() {
    this.adapter = isDbPersistenceEnabled() ? new DbAuthSessionRepository() : new FileAuthSessionRepository();
  }

  save(session: SessionRecord) {
    return this.adapter.save(session);
  }

  revoke(sessionId: string, reason: 'logout' | 'rotated') {
    return this.adapter.revoke(sessionId, reason);
  }

  findActiveByAccessTokenId(tokenId: string, now?: Date) {
    return this.adapter.findActiveByAccessTokenId(tokenId, now);
  }

  findActiveByRefreshTokenId(tokenId: string, now?: Date) {
    return this.adapter.findActiveByRefreshTokenId(tokenId, now);
  }
}
