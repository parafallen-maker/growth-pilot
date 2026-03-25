import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { PermissionGuard } from '../../../common/permission.guard';
import { RequirePermission } from '../../../common/permission.decorator';
import { buildApiResponse } from '../../../shared/api-response';
import { AssignRolesDto } from '../dto/assign-roles.dto';
import { UsersService } from '../service/users.service';

@Controller('users')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('users:view')
  async listUsers(@Query('keyword') keyword?: string) {
    return buildApiResponse(await this.usersService.listUsers(keyword));
  }

  @Post(':userId/roles')
  @RequirePermission('users:view')
  async assignRoles(@Param('userId') userId: string, @Body() body: AssignRolesDto) {
    return buildApiResponse(await this.usersService.assignRoles(userId, body.roleIds ?? []));
  }
}
