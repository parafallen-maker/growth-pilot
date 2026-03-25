import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_METADATA_KEY } from './permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<{ authUser?: { permissions?: string[] } }>();
    const permissions = request.authUser?.permissions ?? [];
    if (!permissions.includes(requiredPermission)) {
      throw new ForbiddenException({
        code: 'AUTH_403',
        message: `missing permission: ${requiredPermission}`,
        details: { requiredPermission },
      });
    }

    return true;
  }
}
