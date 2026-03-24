import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import { FileJsonStore } from '../../../shared/persistence/file-json-store';
import { UsersService } from '../../users/service/users.service';
import { CurrentUserProfile } from '../../users/users.types';

interface SessionRecord {
  sessionId: string;
  userId: string;
  accessTokenId: string;
  refreshTokenId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  createdAt: string;
  rotatedAt?: string | null;
  revokedAt?: string | null;
}

interface AuthStoreShape {
  sessions: SessionRecord[];
}

@Injectable()
export class AuthService {
  private readonly store = new FileJsonStore<AuthStoreShape>('.data/auth-sessions.json', () => ({ sessions: [] }));
  private readonly jwtSecret = process.env.JWT_SECRET ?? 'growthpilot-dev-secret';
  private readonly issuer = 'growthpilot-api';
  private readonly audience = 'growthpilot-web';
  private readonly accessTtlSeconds = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 15 * 60);
  private readonly refreshTtlSeconds = Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 30 * 24 * 60 * 60);

  constructor(private readonly usersService: UsersService) {}

  login(username: string, password: string) {
    const user = this.usersService.validateCredentials(username, password);
    if (!user) {
      throw new UnauthorizedException('invalid username or password');
    }

    const session = this.issueSession(user.id);
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        roles: user.roles,
        campusIds: user.campusIds,
      },
    };
  }

  refresh(refreshToken: string) {
    const claims = this.verifyToken(refreshToken, 'refresh');
    const existingSession = this.getActiveSessionByRefreshTokenId(claims.jti);
    if (!existingSession || existingSession.userId !== claims.sub) {
      throw new UnauthorizedException('refresh token is invalid');
    }

    this.revokeSession(existingSession.sessionId, 'rotated');
    const rotatedSession = this.issueSession(existingSession.userId);
    return {
      accessToken: rotatedSession.accessToken,
      refreshToken: rotatedSession.refreshToken,
    };
  }

  currentUser(accessToken: string): CurrentUserProfile {
    const claims = this.verifyToken(accessToken, 'access');
    const session = this.getActiveSessionByAccessTokenId(claims.jti);
    if (!session || session.userId !== claims.sub) {
      throw new UnauthorizedException('access token is invalid');
    }

    return this.usersService.getCurrentUserProfile(session.userId);
  }

  logout(accessToken?: string, refreshToken?: string) {
    if (accessToken) {
      const accessClaims = this.tryVerifyToken(accessToken, 'access');
      if (accessClaims) {
        const session = this.getActiveSessionByAccessTokenId(accessClaims.jti);
        if (session) this.revokeSession(session.sessionId, 'logout');
      }
    }

    if (refreshToken) {
      const refreshClaims = this.tryVerifyToken(refreshToken, 'refresh');
      if (refreshClaims) {
        const session = this.getActiveSessionByRefreshTokenId(refreshClaims.jti);
        if (session) this.revokeSession(session.sessionId, 'logout');
      }
    }

    return {};
  }

  private issueSession(userId: string): SessionRecord {
    const now = new Date();
    const sessionId = randomUUID();
    const accessTokenId = randomUUID();
    const refreshTokenId = randomUUID();
    const accessExpiresAt = new Date(now.getTime() + this.accessTtlSeconds * 1000).toISOString();
    const refreshExpiresAt = new Date(now.getTime() + this.refreshTtlSeconds * 1000).toISOString();
    const accessToken = this.signToken({ sub: userId, sid: sessionId, jti: accessTokenId, type: 'access', exp: Math.floor(new Date(accessExpiresAt).getTime() / 1000) });
    const refreshToken = this.signToken({ sub: userId, sid: sessionId, jti: refreshTokenId, type: 'refresh', exp: Math.floor(new Date(refreshExpiresAt).getTime() / 1000) });

    const session: SessionRecord = {
      sessionId,
      userId,
      accessTokenId,
      refreshTokenId,
      accessToken,
      refreshToken,
      accessExpiresAt,
      refreshExpiresAt,
      createdAt: now.toISOString(),
      rotatedAt: null,
      revokedAt: null,
    };

    this.store.update((state) => {
      state.sessions = [session, ...state.sessions.filter((item) => item.userId !== userId || item.revokedAt !== null)];
    });

    return session;
  }

  private revokeSession(sessionId: string, reason: 'logout' | 'rotated') {
    this.store.update((state) => {
      const session = state.sessions.find((item) => item.sessionId === sessionId);
      if (!session || session.revokedAt) return;
      session.revokedAt = new Date().toISOString();
      if (reason === 'rotated') {
        session.rotatedAt = session.revokedAt;
      }
    });
  }

  private getActiveSessionByAccessTokenId(tokenId: string) {
    return this.store.read().sessions.find((item) => item.accessTokenId === tokenId && this.isSessionActive(item, 'access'));
  }

  private getActiveSessionByRefreshTokenId(tokenId: string) {
    return this.store.read().sessions.find((item) => item.refreshTokenId === tokenId && this.isSessionActive(item, 'refresh'));
  }

  private isSessionActive(session: SessionRecord, kind: 'access' | 'refresh') {
    const now = Date.now();
    const expiresAt = kind === 'access' ? session.accessExpiresAt : session.refreshExpiresAt;
    return !session.revokedAt && new Date(expiresAt).getTime() > now;
  }

  private signToken(payload: { sub: string; sid: string; jti: string; type: 'access' | 'refresh'; exp: number }) {
    const header = this.base64UrlEncode({ alg: 'HS256', typ: 'JWT' });
    const body = this.base64UrlEncode({ ...payload, iss: this.issuer, aud: this.audience, iat: Math.floor(Date.now() / 1000) });
    const signature = this.sign(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  private verifyToken(token: string, expectedType: 'access' | 'refresh') {
    const claims = this.tryVerifyToken(token, expectedType);
    if (!claims) {
      throw new UnauthorizedException(`${expectedType} token is invalid`);
    }
    return claims;
  }

  private tryVerifyToken(token: string, expectedType: 'access' | 'refresh') {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    if (this.sign(`${header}.${payload}`) !== signature) return null;

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub: string; sid: string; jti: string; type: 'access' | 'refresh'; exp: number; iss: string; aud: string;
    };

    if (claims.type !== expectedType || claims.iss !== this.issuer || claims.aud !== this.audience) return null;
    if (claims.exp * 1000 <= Date.now()) return null;
    return claims;
  }

  private sign(value: string) {
    return createHmac('sha256', this.jwtSecret).update(value).digest('base64url');
  }

  private base64UrlEncode(value: Record<string, unknown>) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }
}
