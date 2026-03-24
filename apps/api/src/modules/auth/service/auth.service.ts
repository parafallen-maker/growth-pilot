import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/service/users.service';
import { CurrentUserProfile } from '../../users/users.types';

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

@Injectable()
export class AuthService {
  private readonly accessTokenToUserId = new Map<string, string>();
  private readonly refreshTokenToUserId = new Map<string, string>();

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
    const userId = this.refreshTokenToUserId.get(refreshToken);
    if (!userId) {
      throw new UnauthorizedException('refresh token is invalid');
    }

    const accessToken = this.buildToken('access', userId);
    this.accessTokenToUserId.set(accessToken, userId);
    return { accessToken };
  }

  currentUser(accessToken: string): CurrentUserProfile {
    const userId = this.accessTokenToUserId.get(accessToken);
    if (!userId) {
      throw new UnauthorizedException('access token is invalid');
    }

    return this.usersService.getCurrentUserProfile(userId);
  }

  logout(accessToken?: string, refreshToken?: string) {
    if (accessToken) {
      this.accessTokenToUserId.delete(accessToken);
    }

    if (refreshToken) {
      this.refreshTokenToUserId.delete(refreshToken);
    }

    return {};
  }

  private issueSession(userId: string): SessionTokens {
    const accessToken = this.buildToken('access', userId);
    const refreshToken = this.buildToken('refresh', userId);

    this.accessTokenToUserId.set(accessToken, userId);
    this.refreshTokenToUserId.set(refreshToken, userId);

    return {
      accessToken,
      refreshToken,
      userId,
    };
  }

  private buildToken(kind: 'access' | 'refresh', userId: string) {
    return `${kind}-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
