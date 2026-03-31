import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import { getAuthCookieOptions, hashToken, requireJwtSecret, secureCompare } from '../../../common/security';
import { DefaultAuthSessionRepository } from '../repository/auth-session.repository';
import { SessionRecord } from '../auth.types';
import { UsersService } from '../../users/service/users.service';
import { CurrentUserProfile } from '../../users/users.types';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthSessionCacheService } from './auth-session-cache.service';

interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  session: SessionRecord;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret = requireJwtSecret();
  private readonly issuer = 'growthpilot-api';
  private readonly audience = 'growthpilot-web';
  private readonly accessTtlSeconds = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 2 * 60 * 60);
  private readonly refreshTtlSeconds = Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 30 * 24 * 60 * 60);
  private readonly loginRateLimitMax = Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX ?? 10);
  private readonly loginRateLimitWindowSeconds = Number(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS ?? 60);
  private readonly refreshRateLimitMax = Number(process.env.AUTH_REFRESH_RATE_LIMIT_MAX ?? 20);
  private readonly refreshRateLimitWindowSeconds = Number(process.env.AUTH_REFRESH_RATE_LIMIT_WINDOW_SECONDS ?? 60);

  constructor(
    private readonly usersService: UsersService,
    private readonly authSessionRepository: DefaultAuthSessionRepository,
    private readonly authSessionCacheService: AuthSessionCacheService,
    private readonly authRateLimitService: AuthRateLimitService,
  ) {}

  getCookieOptions() {
    return getAuthCookieOptions();
  }

  async login(username: string, password: string, actorKey?: string) {
    const loginActorKey = this.buildLoginActorKey(username, actorKey);
    await this.enforceRateLimit('login', loginActorKey, this.loginRateLimitMax, this.loginRateLimitWindowSeconds);

    const user = await this.usersService.validateCredentials(username, password);
    if (!user) {
      throw new UnauthorizedException('invalid username or password');
    }

    const session = await this.issueSession(user.id);
    await this.authRateLimitService.reset('login', loginActorKey);
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

  async refresh(refreshToken: string, actorKey?: string) {
    await this.enforceRateLimit(
      'refresh',
      this.buildRefreshActorKey(refreshToken, actorKey),
      this.refreshRateLimitMax,
      this.refreshRateLimitWindowSeconds,
    );

    const claims = this.verifyToken(refreshToken, 'refresh');
    const existingSession = await this.getActiveSessionByRefreshTokenId(claims.jti);
    if (!existingSession || existingSession.userId !== claims.sub) {
      throw new UnauthorizedException('refresh token is invalid');
    }

    await this.revokeSession(existingSession.sessionId, 'rotated');
    await this.authSessionCacheService.evict(existingSession);
    const rotatedSession = await this.issueSession(existingSession.userId);
    return {
      accessToken: rotatedSession.accessToken,
      refreshToken: rotatedSession.refreshToken,
    };
  }

  async currentUser(accessToken: string): Promise<CurrentUserProfile> {
    const claims = this.verifyToken(accessToken, 'access');
    const session = await this.getActiveSessionByAccessTokenId(claims.jti);
    if (!session || session.userId !== claims.sub) {
      throw new UnauthorizedException('access token is invalid');
    }

    return this.usersService.getCurrentUserProfile(session.userId);
  }

  async logout(accessToken?: string, refreshToken?: string) {
    if (accessToken) {
      const accessClaims = this.tryVerifyToken(accessToken, 'access');
      if (accessClaims) {
        const session = await this.getActiveSessionByAccessTokenId(accessClaims.jti);
        if (session) {
          await this.revokeSession(session.sessionId, 'logout');
          await this.authSessionCacheService.evict(session);
        }
      }
    }

    if (refreshToken) {
      const refreshClaims = this.tryVerifyToken(refreshToken, 'refresh');
      if (refreshClaims) {
        const session = await this.getActiveSessionByRefreshTokenId(refreshClaims.jti);
        if (session) {
          await this.revokeSession(session.sessionId, 'logout');
          await this.authSessionCacheService.evict(session);
        }
      }
    }

    return {};
  }

  private async issueSession(userId: string): Promise<IssuedSession> {
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
      accessToken: hashToken(accessToken),
      refreshToken: hashToken(refreshToken),
      accessExpiresAt,
      refreshExpiresAt,
      createdAt: now.toISOString(),
      rotatedAt: null,
      revokedAt: null,
    };

    await this.authSessionRepository.save(session);
    await this.authSessionCacheService.cache(session);

    return { session, accessToken, refreshToken };
  }

  private revokeSession(sessionId: string, reason: 'logout' | 'rotated') {
    return this.authSessionRepository.revoke(sessionId, reason);
  }

  private getActiveSessionByAccessTokenId(tokenId: string) {
    return this.getOrLoadSession('access', tokenId);
  }

  private getActiveSessionByRefreshTokenId(tokenId: string) {
    return this.getOrLoadSession('refresh', tokenId);
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
    if (!secureCompare(this.sign(`${header}.${payload}`), signature)) return null;

    let claims: { sub: string; sid: string; jti: string; type: 'access' | 'refresh'; exp: number; iss: string; aud: string };
    try {
      claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      return null;
    }

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

  private async getOrLoadSession(kind: 'access' | 'refresh', tokenId: string) {
    const cached = kind === 'access'
      ? await this.authSessionCacheService.getByAccessTokenId(tokenId)
      : await this.authSessionCacheService.getByRefreshTokenId(tokenId);
    if (cached) {
      return cached;
    }

    const session = kind === 'access'
      ? await this.authSessionRepository.findActiveByAccessTokenId(tokenId)
      : await this.authSessionRepository.findActiveByRefreshTokenId(tokenId);
    if (session) {
      await this.authSessionCacheService.cache(session);
    }
    return session;
  }

  private async enforceRateLimit(scope: string, actorKey: string, limit: number, windowSeconds: number) {
    const decision = await this.authRateLimitService.consume(scope, actorKey, limit, windowSeconds);
    if (!decision.allowed) {
      throw new HttpException(`too many ${scope} attempts, retry in ${decision.retryAfterSeconds}s`, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private buildLoginActorKey(username: string, actorKey?: string) {
    return `${username.trim().toLowerCase()}:${actorKey?.trim() || 'unknown'}`;
  }

  private buildRefreshActorKey(refreshToken: string, actorKey?: string) {
    return `${this.sign(refreshToken).slice(0, 24)}:${actorKey?.trim() || 'unknown'}`;
  }
}
