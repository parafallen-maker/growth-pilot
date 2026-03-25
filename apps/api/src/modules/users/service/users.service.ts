import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPagedResult } from '../../../shared/api-response';
import { UsersRepository } from '../repository/users.repository';
import { CurrentUserProfile, Permission, Role, UserRecord } from '../users.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async listUsers(keyword?: string) {
    const users = (await this.usersRepository.list(keyword)).map((user) => this.toContractUser(user));
    return buildPagedResult(users);
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

  async validateCredentials(username: string, password: string): Promise<UserRecord | undefined> {
    const user = await this.usersRepository.findByUsername(username);
    if (!user || user.password !== password || user.status !== 'active') {
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
    };
  }
}
