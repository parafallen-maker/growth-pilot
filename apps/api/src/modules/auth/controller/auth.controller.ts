import { BadRequestException, Body, Controller, Get, Headers, Post, Res } from '@nestjs/common';
import { exposeSensitiveResponseFields, rateLimit } from '../../../common/security';
import { buildApiResponse } from '../../../shared/api-response';
import { LoginDto, RefreshTokenDto } from '../dto/login.dto';
import { AuthService } from '../service/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @rateLimit({ keyPrefix: 'auth-login', limit: 5, ttlMs: 60_000 })
  @exposeSensitiveResponseFields('accessToken', 'refreshToken')
  async login(
    @Body() body: LoginDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Res({ passthrough: true }) response?: any,
  ) {
    const result = await this.authService.login(body.username, body.password, this.extractClientAddress(headers));
    this.applyAuthCookies(response, result.accessToken, result.refreshToken);
    return buildApiResponse(result);
  }

  @Post('refresh')
  @rateLimit({ keyPrefix: 'auth-refresh', limit: 10, ttlMs: 60_000 })
  @exposeSensitiveResponseFields('accessToken', 'refreshToken')
  async refresh(
    @Body() body: RefreshTokenDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Res({ passthrough: true }) response?: any,
  ) {
    const result = await this.authService.refresh(body.refreshToken, this.extractClientAddress(headers));
    this.applyAuthCookies(response, result.accessToken, result.refreshToken);
    return buildApiResponse(result);
  }

  @Get('me')
  async currentUser(@Headers('authorization') authorization?: string) {
    const token = this.extractBearerToken(authorization);
    if (!token) {
      throw new Error('authorization header is required');
    }
    return buildApiResponse(await this.authService.currentUser(token));
  }

  @Post('logout')
  async logout(
    @Headers('authorization') authorization?: string,
    @Body() body?: RefreshTokenDto,
    @Res({ passthrough: true }) response?: any,
  ) {
    this.clearAuthCookies(response);
    return buildApiResponse(
      await this.authService.logout(this.extractBearerToken(authorization, false), body?.refreshToken),
    );
  }

  private applyAuthCookies(response: any, accessToken: string, refreshToken: string) {
    if (!response?.cookie) {
      return;
    }

    const options = this.authService.getCookieOptions();
    response.cookie('gp_access_token', accessToken, {
      ...options,
      maxAge: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 15 * 60) * 1000,
    });
    response.cookie('gp_refresh_token', refreshToken, {
      ...options,
      maxAge: Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 30 * 24 * 60 * 60) * 1000,
    });
  }

  private clearAuthCookies(response: any) {
    if (!response?.clearCookie) {
      return;
    }

    const options = this.authService.getCookieOptions();
    response.clearCookie('gp_access_token', options);
    response.clearCookie('gp_refresh_token', options);
  }

  private extractBearerToken(authorization?: string, required = true) {
    if (!authorization) {
      if (required) {
        throw new BadRequestException('authorization header is required');
      }
      return undefined;
    }

    return authorization.replace(/^Bearer\s+/i, '');
  }

  private extractClientAddress(headers?: Record<string, string | string[] | undefined>) {
    if (!headers) {
      return 'unknown';
    }

    const candidates = [
      headers['x-forwarded-for'],
      headers['x-real-ip'],
      headers['cf-connecting-ip'],
    ];

    for (const value of candidates) {
      const normalized = Array.isArray(value) ? value[0] : value;
      if (!normalized?.trim()) {
        continue;
      }

      return normalized.split(',')[0]?.trim() || 'unknown';
    }

    return 'unknown';
  }
}
