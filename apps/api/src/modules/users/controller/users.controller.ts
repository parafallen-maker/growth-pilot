import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { buildApiResponse } from '../../../shared/api-response';
import { AssignRolesDto } from '../dto/assign-roles.dto';
import { UsersService } from '../service/users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers(@Query('keyword') keyword?: string) {
    return buildApiResponse(this.usersService.listUsers(keyword));
  }

  @Post(':userId/roles')
  assignRoles(@Param('userId') userId: string, @Body() body: AssignRolesDto) {
    return buildApiResponse(this.usersService.assignRoles(userId, body.roleIds ?? []));
  }
}
