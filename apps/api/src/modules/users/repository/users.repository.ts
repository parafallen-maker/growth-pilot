import { Injectable } from '@nestjs/common';
import { Permission, Role, UserRecord } from '../users.types';

@Injectable()
export class UsersRepository {
  private readonly permissions: Permission[] = [
    {
      id: 'perm-auth-session-read',
      code: 'auth.session.read',
      name: '读取会话信息',
      module: 'auth',
      action: 'read',
    },
    {
      id: 'perm-settings-campus-read',
      code: 'settings.campus.read',
      name: '读取校区',
      module: 'settings',
      action: 'read',
    },
    {
      id: 'perm-settings-term-read',
      code: 'settings.term.read',
      name: '读取学期',
      module: 'settings',
      action: 'read',
    },
    {
      id: 'perm-settings-dictionary-read',
      code: 'settings.dictionary.read',
      name: '读取字典',
      module: 'settings',
      action: 'read',
    },
    {
      id: 'perm-jobs-read',
      code: 'jobs.read',
      name: '读取任务中心',
      module: 'jobs',
      action: 'read',
    },
    {
      id: 'perm-users-read',
      code: 'users.read',
      name: '读取用户',
      module: 'users',
      action: 'read',
    },
    {
      id: 'perm-users-role-bind',
      code: 'users.role.bind',
      name: '绑定用户角色',
      module: 'users',
      action: 'bind',
    },
  ];

  private readonly roles: Role[] = [
    {
      id: 'role-admin',
      code: 'admin',
      name: '系统管理员',
      scopeLevel: 'system',
      status: 'active',
      permissionIds: this.permissions.map((permission) => permission.id),
    },
    {
      id: 'role-teacher',
      code: 'teacher',
      name: '任课老师',
      scopeLevel: 'campus',
      status: 'active',
      permissionIds: [
        'perm-auth-session-read',
        'perm-settings-campus-read',
        'perm-settings-term-read',
        'perm-settings-dictionary-read',
      ],
    },
  ];

  private readonly users: UserRecord[] = [
    {
      id: 'user-admin-001',
      username: 'admin',
      password: 'admin123',
      displayName: '系统管理员',
      mobile: '13800000000',
      email: 'admin@growthpilot.local',
      roles: ['admin'],
      campusIds: ['campus-guanshanhu', 'campus-nanming'],
      status: 'active',
    },
    {
      id: 'user-teacher-001',
      username: 'teacher.zhang',
      password: 'teacher123',
      displayName: '张老师',
      mobile: '13800000001',
      email: 'teacher.zhang@growthpilot.local',
      roles: ['teacher'],
      campusIds: ['campus-guanshanhu'],
      status: 'active',
    },
  ];

  findByUsername(username: string): UserRecord | undefined {
    return this.users.find((user) => user.username === username);
  }

  findById(userId: string): UserRecord | undefined {
    return this.users.find((user) => user.id === userId);
  }

  list(keyword?: string): UserRecord[] {
    if (!keyword) {
      return [...this.users];
    }

    const normalized = keyword.trim().toLowerCase();
    return this.users.filter((user) => {
      return (
        user.username.toLowerCase().includes(normalized) ||
        user.displayName.toLowerCase().includes(normalized)
      );
    });
  }

  listRoles(): Role[] {
    return [...this.roles];
  }

  listPermissions(): Permission[] {
    return [...this.permissions];
  }

  assignRoles(userId: string, roleCodes: string[]): UserRecord | undefined {
    const user = this.findById(userId);
    if (!user) {
      return undefined;
    }

    user.roles = [...new Set(roleCodes)];
    return user;
  }
}
