import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { PermissionGuard } from '../../../common/permission.guard';
import { RequirePermission } from '../../../common/permission.decorator';
import { buildApiResponse } from '../../../shared/api-response';
import { AssignRolesDto } from '../dto/assign-roles.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UsersService } from '../service/users.service';

@Controller('users')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('users:view')
  async listUsers(@Query() query: ListUsersQueryDto = {}) {
    return buildApiResponse(
      await this.usersService.listUsers(
        query.keyword,
        query.pageNo ?? 1,
        query.pageSize ?? 20,
      ),
    );
  }

  @Post(':userId/roles')
  @RequirePermission('users:view')
  async assignRoles(@Param('userId') userId: string, @Body() body: AssignRolesDto) {
    return buildApiResponse(await this.usersService.assignRoles(userId, body.roleIds ?? []));
  }

  @Post()
  @RequirePermission('users.role.bind')
  async createUser(@Body() body: CreateUserDto) {
    return buildApiResponse(await this.usersService.createUser(body));
  }
}
