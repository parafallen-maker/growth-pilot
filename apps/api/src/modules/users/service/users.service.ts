import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { normalizePage } from '../../../common/base-list-query.dto';
import { PasswordService } from '../../../common/security';
import { CreateUserDto } from '../dto/create-user.dto';
import { UsersRepository } from '../repository/users.repository';
import { CurrentUserProfile, Permission, Role, UserRecord } from '../users.types';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService = new PasswordService(),
  ) {}

  async listUsers(keyword?: string, pageNo = 1, pageSize = 20) {
    const normalized = normalizePage({ pageNo, pageSize });
    const users = (await this.usersRepository.list(keyword)).map((user) => this.toContractUser(user));
    const start = Math.max(normalized.pageNo - 1, 0) * normalized.pageSize;
    return {
      list: users.slice(start, start + normalized.pageSize),
      page: { pageNo: normalized.pageNo, pageSize: normalized.pageSize, total: users.length },
    };
  }

  async getCurrentUserProfile(userId: string): Promise<CurrentUserProfile> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('user not found');
    }

    const roleMap = new Map((await this.usersRepository.listRoles()).map((role) => [role.code, role]));
    const permissionMap = new Map(
      (await this.usersRepository.listPermissions()).map((permission) => [permission.id, permission]),
    );

    const roles = user.roles
      .map((roleCode) => roleMap.get(roleCode))
      .filter((role): role is Role => Boolean(role));

    const permissions = [...new Set(roles.flatMap((role) => role.permissionIds))]
      .map((permissionId) => permissionMap.get(permissionId))
      .filter((permission): permission is Permission => Boolean(permission))
      .map((permission) => permission.code)
      .sort();

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: [...user.roles],
      campusIds: [...user.campusIds],
      permissions,
    };
  }

  async assignRoles(userId: string, roleIds: string[]) {
    const roleCodes = new Set((await this.usersRepository.listRoles()).map((role) => role.code));
    const resolvedRoles = roleIds.filter((roleId) => roleCodes.has(roleId));
    const updatedUser = await this.usersRepository.assignRoles(userId, resolvedRoles);
    if (!updatedUser) {
      throw new NotFoundException('user not found');
    }

    return { success: true };
  }

  async createUser(payload: CreateUserDto) {
    const roles = await this.usersRepository.listRoles();
    const roleCodes = new Set(roles.map((role) => role.code));
    const requestedRoleIds = payload.roleIds ?? [];
    const invalidRoleIds = requestedRoleIds.filter((roleId) => !roleCodes.has(roleId));
    if (invalidRoleIds.length) {
      throw new ConflictException({
        code: 'DATA_409',
        message: `invalid role ids: ${invalidRoleIds.join(', ')}`,
      });
    }

    const created = await this.usersRepository.create({
      username: payload.username,
      passwordHash: this.passwordService.hash(payload.password),
      displayName: payload.displayName,
      mobile: payload.mobile,
      email: payload.email,
      roles: requestedRoleIds,
      campusIds: payload.campusIds ?? [],
      status: payload.status ?? 'active',
    });
    return this.toContractUser(created);
  }

  async validateCredentials(username: string, password: string): Promise<UserRecord | undefined> {
    const user = await this.usersRepository.findByUsername(username);
    if (!user || user.status !== 'active' || !this.passwordService.verify(password, user.passwordHash)) {
      return undefined;
    }

    return user;
  }

  private toContractUser(user: UserRecord) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: [...user.roles],
      campusIds: [...user.campusIds],
      status: user.status,
    };
  }
}
