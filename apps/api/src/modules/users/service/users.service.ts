import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPagedResult } from '../../../shared/api-response';
import { UsersRepository } from '../repository/users.repository';
import { CurrentUserProfile, Permission, Role, UserRecord } from '../users.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  listUsers(keyword?: string) {
    const users = this.usersRepository.list(keyword).map((user) => this.toContractUser(user));
    return buildPagedResult(users);
  }

  getCurrentUserProfile(userId: string): CurrentUserProfile {
    const user = this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('user not found');
    }

    const roleMap = new Map(this.usersRepository.listRoles().map((role) => [role.code, role]));
    const permissionMap = new Map(
      this.usersRepository.listPermissions().map((permission) => [permission.id, permission]),
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

  assignRoles(userId: string, roleIds: string[]) {
    const roleCodes = new Set(this.usersRepository.listRoles().map((role) => role.code));
    const resolvedRoles = roleIds.filter((roleId) => roleCodes.has(roleId));
    const updatedUser = this.usersRepository.assignRoles(userId, resolvedRoles);
    if (!updatedUser) {
      throw new NotFoundException('user not found');
    }

    return { success: true };
  }

  validateCredentials(username: string, password: string): UserRecord | undefined {
    const user = this.usersRepository.findByUsername(username);
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
