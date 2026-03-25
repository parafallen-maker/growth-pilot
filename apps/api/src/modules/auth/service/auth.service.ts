import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import { DefaultAuthSessionRepository } from '../repository/auth-session.repository';
import { AuthSessionRepository, SessionRecord } from '../auth.types';
import { UsersService } from '../../users/service/users.service';
import { CurrentUserProfile } from '../../users/users.types';

@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET ?? 'growthpilot-dev-secret';
  private readonly issuer = 'growthpilot-api';
  private readonly audience = 'growthpilot-web';
  private readonly accessTtlSeconds = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 15 * 60);
  private readonly refreshTtlSeconds = Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 30 * 24 * 60 * 60);

  constructor(
    private readonly usersService: UsersService,
    private readonly authSessionRepository: AuthSessionRepository = new DefaultAuthSessionRepository(),
  ) {}

  async login(username: string, password: string) {
    const user = await this.usersService.validateCredentials(username, password);
    if (!user) {
      throw new UnauthorizedException('invalid username or password');
    }

    const session = await this.issueSession(user.id);
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

  async refresh(refreshToken: string) {
    const claims = this.verifyToken(refreshToken, 'refresh');
    const existingSession = await this.getActiveSessionByRefreshTokenId(claims.jti);
    if (!existingSession || existingSession.userId !== claims.sub) {
      throw new UnauthorizedException('refresh token is invalid');
    }

    await this.revokeSession(existingSession.sessionId, 'rotated');
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
        if (session) await this.revokeSession(session.sessionId, 'logout');
      }
    }

    if (refreshToken) {
      const refreshClaims = this.tryVerifyToken(refreshToken, 'refresh');
      if (refreshClaims) {
        const session = await this.getActiveSessionByRefreshTokenId(refreshClaims.jti);
        if (session) await this.revokeSession(session.sessionId, 'logout');
      }
    }

    return {};
  }

  private async issueSession(userId: string): Promise<SessionRecord> {
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

    await this.authSessionRepository.save(session);

    return session;
  }

  private revokeSession(sessionId: string, reason: 'logout' | 'rotated') {
    return this.authSessionRepository.revoke(sessionId, reason);
  }

  private getActiveSessionByAccessTokenId(tokenId: string) {
    return this.authSessionRepository.findActiveByAccessTokenId(tokenId);
  }

  private getActiveSessionByRefreshTokenId(tokenId: string) {
    return this.authSessionRepository.findActiveByRefreshTokenId(tokenId);
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
