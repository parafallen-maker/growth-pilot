import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { buildApiResponse } from '../../../shared/api-response';
import { LoginDto, RefreshTokenDto } from '../dto/login.dto';
import { AuthService } from '../service/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return buildApiResponse(this.authService.login(body.username, body.password));
  }

  @Post('refresh')
  refresh(@Body() body: RefreshTokenDto) {
    return buildApiResponse(this.authService.refresh(body.refreshToken));
  }

  @Get('me')
  currentUser(@Headers('authorization') authorization?: string) {
    const token = this.extractBearerToken(authorization);
    if (!token) {
      throw new Error('authorization header is required');
    }
    return buildApiResponse(this.authService.currentUser(token));
  }

  @Post('logout')
  logout(
    @Headers('authorization') authorization?: string,
    @Body() body?: RefreshTokenDto,
  ) {
    return buildApiResponse(
      this.authService.logout(this.extractBearerToken(authorization, false), body?.refreshToken),
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
}
