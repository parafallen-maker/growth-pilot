import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../modules/auth/service/auth.service';

@Injectable()
export class ApiAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; authUser?: unknown }>();
    const header = request.headers.authorization ?? request.headers.Authorization;
    const token = this.extractBearerToken(header);
    if (!token) {
      throw new UnauthorizedException({ code: 'AUTH_401', message: 'missing bearer token' });
    }

    const user = this.authService.currentUser(token);
    request.authUser = user;
    return true;
  }

  private extractBearerToken(header?: string) {
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
    return token;
  }
}
