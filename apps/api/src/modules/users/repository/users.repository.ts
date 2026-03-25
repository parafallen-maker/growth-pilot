import { Injectable } from '@nestjs/common';
import { InferSelectModel, asc, eq, inArray, like } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { createDb, dbSchema } from '../../../db';
import { FileJsonStore } from '../../../shared/persistence/file-json-store';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';
import { Permission, Role, UserRecord } from '../users.types';

interface UsersStoreShape {
  permissions: Permission[];
  roles: Role[];
  users: UserRecord[];
}

const defaultPermissions: Permission[] = [
  { id: 'perm-auth-session-read', code: 'auth.session.read', name: '读取会话信息', module: 'auth', action: 'read' },
  { id: 'perm-settings-campus-read', code: 'settings.campus.read', name: '读取校区', module: 'settings', action: 'read' },
  { id: 'perm-settings-term-read', code: 'settings.term.read', name: '读取学期', module: 'settings', action: 'read' },
  { id: 'perm-settings-dictionary-read', code: 'settings.dictionary.read', name: '读取字典', module: 'settings', action: 'read' },
  { id: 'perm-jobs-read', code: 'jobs.read', name: '读取任务中心', module: 'jobs', action: 'read' },
  { id: 'perm-users-read', code: 'users.read', name: '读取用户', module: 'users', action: 'read' },
  { id: 'perm-users-role-bind', code: 'users.role.bind', name: '绑定用户角色', module: 'users', action: 'bind' },
];

const defaultRoles: Role[] = [
  { id: 'role-admin', code: 'admin', name: '系统管理员', scopeLevel: 'system', status: 'active', permissionIds: defaultPermissions.map((permission) => permission.id) },
  {
    id: 'role-teacher',
    code: 'teacher',
    name: '任课老师',
    scopeLevel: 'campus',
    status: 'active',
    permissionIds: ['perm-auth-session-read', 'perm-settings-campus-read', 'perm-settings-term-read', 'perm-settings-dictionary-read'],
  },
];

const defaultUsers: UserRecord[] = [
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

interface UsersRepositoryPort {
  findByUsername(username: string): Promise<UserRecord | undefined>;
  findById(userId: string): Promise<UserRecord | undefined>;
  list(keyword?: string): Promise<UserRecord[]>;
  listRoles(): Promise<Role[]>;
  listPermissions(): Promise<Permission[]>;
  assignRoles(userId: string, roleCodes: string[]): Promise<UserRecord | undefined>;
}

class FileUsersRepository implements UsersRepositoryPort {
  private readonly store = new FileJsonStore<UsersStoreShape>('.data/users.json', () => ({
    permissions: structuredClone(defaultPermissions),
    roles: structuredClone(defaultRoles),
    users: structuredClone(defaultUsers),
  }));

  async findByUsername(username: string) {
    return this.store.read().users.find((user) => user.username === username);
  }

  async findById(userId: string) {
    return this.store.read().users.find((user) => user.id === userId);
  }

  async list(keyword?: string) {
    const users = this.store.read().users;
    if (!keyword) return [...users];
    const normalized = keyword.trim().toLowerCase();
    return users.filter((user) => user.username.toLowerCase().includes(normalized) || user.displayName.toLowerCase().includes(normalized));
  }

  async listRoles() {
    return [...this.store.read().roles];
  }

  async listPermissions() {
    return [...this.store.read().permissions];
  }

  async assignRoles(userId: string, roleCodes: string[]) {
    return this.store.update((state) => {
      const user = state.users.find((item) => item.id === userId);
      if (!user) return undefined;
      user.roles = [...new Set(roleCodes)];
      return user;
    });
  }
}

class DbUsersRepository implements UsersRepositoryPort {
  private readonly db = createDb();

  async findByUsername(username: string) {
    const rows = await this.db.select().from(dbSchema.users).where(eq(dbSchema.users.username, username)).limit(1);
    return this.enrichUser(rows[0]);
  }

  async findById(userId: string) {
    const rows = await this.db.select().from(dbSchema.users).where(eq(dbSchema.users.id, userId)).limit(1);
    return this.enrichUser(rows[0]);
  }

  async list(keyword?: string) {
    const normalized = keyword?.trim();
    const rows = normalized
      ? await this.db.select().from(dbSchema.users).where(like(dbSchema.users.displayName, `%${normalized}%`))
      : await this.db.select().from(dbSchema.users).orderBy(asc(dbSchema.users.createdAt));

    return Promise.all(rows.map((row) => this.enrichUser(row))) as Promise<UserRecord[]>;
  }

  async listRoles() {
    const roleRows = await this.db.select().from(dbSchema.roles).orderBy(asc(dbSchema.roles.code));
    const fallbackPermissionMap = new Map(defaultRoles.map((role) => [role.code, role.permissionIds]));
    const allPermissionIds = (await this.listPermissions()).map((permission) => permission.id);

    return roleRows.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      scopeLevel: (role.scopeLevel === 'system' ? 'system' : 'campus') as Role['scopeLevel'],
      status: role.status,
      permissionIds: fallbackPermissionMap.get(role.code) ?? allPermissionIds,
    }));
  }

  async listPermissions() {
    const rows = await this.db.select().from(dbSchema.permissions).orderBy(asc(dbSchema.permissions.code));
    return rows.map((row) => ({ id: row.id, code: row.code, name: row.name, module: row.module, action: row.action }));
  }

  async assignRoles(userId: string, roleCodes: string[]) {
    const roleRows = roleCodes.length
      ? await this.db.select().from(dbSchema.roles).where(inArray(dbSchema.roles.code, roleCodes))
      : [];
    const existing = await this.findById(userId);
    if (!existing) return undefined;

    await this.db.transaction(async (tx) => {
      await tx.delete(dbSchema.userRoles).where(eq(dbSchema.userRoles.userId, userId));
      if (roleRows.length) {
        await tx.insert(dbSchema.userRoles).values(
          roleRows.flatMap((role) =>
            (existing.campusIds.length ? existing.campusIds : [null]).map((campusId) => ({ userId, roleId: role.id, campusId })),
          ),
        );
      }
    });

    return this.findById(userId);
  }

  private async enrichUser(row: InferSelectModel<typeof dbSchema.users> | undefined) {
    if (!row) return undefined;

    const assignments = await this.db.select().from(dbSchema.userRoles).where(eq(dbSchema.userRoles.userId, row.id));
    const roleIds = assignments.map((assignment) => assignment.roleId);
    const roleRows = roleIds.length ? await this.db.select().from(dbSchema.roles).where(inArray(dbSchema.roles.id, roleIds)) : [];

    return {
      id: row.id,
      username: row.username,
      password: row.passwordHash,
      displayName: row.displayName,
      mobile: row.mobile ?? undefined,
      email: row.email ?? undefined,
      roles: roleRows.map((role) => role.code),
      campusIds: [...new Set(assignments.map((assignment) => assignment.campusId).filter((campusId): campusId is string => Boolean(campusId)))],
      status: row.status,
    } satisfies UserRecord;
  }
}

@Injectable()
export class UsersRepository {
  private readonly adapter: UsersRepositoryPort;

  constructor() {
    this.adapter = isDbPersistenceEnabled() ? new DbUsersRepository() : new FileUsersRepository();
  }

  findByUsername(username: string) {
    return this.adapter.findByUsername(username);
  }

  findById(userId: string) {
    return this.adapter.findById(userId);
  }

  list(keyword?: string) {
    return this.adapter.list(keyword);
  }

  listRoles() {
    return this.adapter.listRoles();
  }

  listPermissions() {
    return this.adapter.listPermissions();
  }

  assignRoles(userId: string, roleCodes: string[]) {
    return this.adapter.assignRoles(userId, roleCodes);
  }
}

export const usersRepositorySeed = {
  permissions: defaultPermissions,
  roles: defaultRoles,
  users: defaultUsers.map((user) => ({ ...user, id: user.id || randomUUID() })),
};
