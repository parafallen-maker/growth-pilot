import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { buildApiResponse } from '../../../shared/api-response';
import { LoginDto, RefreshTokenDto } from '../dto/login.dto';
import { AuthService } from '../service/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Headers() headers: Record<string, string | string[] | undefined>) {
    return buildApiResponse(await this.authService.login(body.username, body.password, this.extractClientAddress(headers)));
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto, @Headers() headers: Record<string, string | string[] | undefined>) {
    return buildApiResponse(await this.authService.refresh(body.refreshToken, this.extractClientAddress(headers)));
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
  ) {
    return buildApiResponse(
      await this.authService.logout(this.extractBearerToken(authorization, false), body?.refreshToken),
    );
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
