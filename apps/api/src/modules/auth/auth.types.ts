export interface SessionRecord {
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

export interface AuthSessionRepository {
  save(session: SessionRecord): Promise<SessionRecord>;
  revoke(sessionId: string, reason: 'logout' | 'rotated'): Promise<SessionRecord | undefined>;
  findActiveByAccessTokenId(tokenId: string, now?: Date): Promise<SessionRecord | undefined>;
  findActiveByRefreshTokenId(tokenId: string, now?: Date): Promise<SessionRecord | undefined>;
}
