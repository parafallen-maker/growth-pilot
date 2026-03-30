import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InferSelectModel, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { createDb, dbSchema } from '../../../db';
import { FileJsonStore } from '../../../shared/persistence/file-json-store';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';
import { Permission, Role, UserRecord } from '../users.types';
import { settingsRepositorySeed } from '../../settings/repository/settings.repository';

interface UsersStoreShape {
  permissions: Permission[];
  roles: Role[];
  users: UserRecord[];
}

// Sync hash used only for static seed data at module load time
const bcryptSync = require('bcryptjs') as { hashSync(data: string, rounds: number): string };
const seedHash = (plain: string) => bcryptSync.hashSync(plain, 12);

// Generate stable permission IDs at module load time — keyed by code for cross-reference
const permDefs = [
  { code: 'auth.session.read', name: '读取会话信息', module: 'auth', action: 'read' },
  { code: 'settings:view', name: '查看设置', module: 'settings', action: 'view' },
  { code: 'jobs.read', name: '读取任务中心', module: 'jobs', action: 'read' },
  { code: 'users:view', name: '查看用户', module: 'users', action: 'view' },
  { code: 'users.read', name: '读取用户（兼容旧约定）', module: 'users', action: 'read' },
  { code: 'users.role.bind', name: '绑定用户角色', module: 'users', action: 'bind' },
  { code: 'teachers:view', name: '查看教师', module: 'teachers', action: 'view' },
  { code: 'students:view', name: '查看学生', module: 'students', action: 'view' },
  { code: 'families:view', name: '查看家庭', module: 'families', action: 'view' },
  { code: 'analytics:overview:view', name: '查看总览分析', module: 'analytics', action: 'view' },
  { code: 'analytics:teaching:view', name: '查看教学分析', module: 'analytics', action: 'view' },
  { code: 'analytics:billing:view', name: '查看收费分析', module: 'analytics', action: 'view' },
  { code: 'attendance:board:view', name: '查看签到看板', module: 'attendance', action: 'view' },
  { code: 'attendance:board:manage', name: '管理签到事件', module: 'attendance', action: 'manage' },
  { code: 'attendance:devices:view', name: '查看设备', module: 'attendance', action: 'view' },
  { code: 'attendance:devices:manage', name: '管理设备', module: 'attendance', action: 'manage' },
  { code: 'attendance:homework-time:view', name: '查看作业时长', module: 'attendance', action: 'view' },
  { code: 'billing:products:view', name: '查看收费产品', module: 'billing', action: 'view' },
  { code: 'billing:products:manage', name: '管理收费产品', module: 'billing', action: 'manage' },
  { code: 'billing:contracts:view', name: '查看合同', module: 'billing', action: 'view' },
  { code: 'billing:contracts:manage', name: '管理合同', module: 'billing', action: 'manage' },
  { code: 'billing:invoices:view', name: '查看账单', module: 'billing', action: 'view' },
  { code: 'billing:payments:manage', name: '管理收款', module: 'billing', action: 'manage' },
  { code: 'billing:refunds:manage', name: '管理退款', module: 'billing', action: 'manage' },
  { code: 'billing:renewals:view', name: '查看续费', module: 'billing', action: 'view' },
  { code: 'billing:renewals:manage', name: '管理续费', module: 'billing', action: 'manage' },
  { code: 'communication:records:view', name: '查看沟通记录', module: 'communication', action: 'view' },
  { code: 'communication:records:manage', name: '管理沟通记录', module: 'communication', action: 'manage' },
  { code: 'communication:templates:view', name: '查看消息模板', module: 'communication', action: 'view' },
  { code: 'communication:templates:manage', name: '管理消息模板', module: 'communication', action: 'manage' },
  { code: 'communication:messages:view', name: '查看消息任务', module: 'communication', action: 'view' },
  { code: 'communication:messages:manage', name: '管理消息任务', module: 'communication', action: 'manage' },
] as const;

const defaultPermissions: Permission[] = permDefs.map((def) => ({ id: randomUUID(), ...def }));
const permIdByCode = new Map(defaultPermissions.map((p) => [p.code, p.id]));

const teacherPermissionCodes = [
  'auth.session.read',
  'settings:view',
  'teachers:view',
  'students:view',
  'families:view',
  'analytics:overview:view',
  'analytics:teaching:view',
  'attendance:board:view',
  'attendance:homework-time:view',
  'communication:records:view',
  'communication:templates:view',
  'communication:messages:view',
];

const defaultRoles: Role[] = [
  { id: randomUUID(), code: 'admin', name: '系统管理员', scopeLevel: 'system', status: 'active', permissionIds: defaultPermissions.map((permission) => permission.id) },
  {
    id: randomUUID(),
    code: 'teacher',
    name: '任课老师',
    scopeLevel: 'campus',
    status: 'active',
    permissionIds: teacherPermissionCodes.map((code) => permIdByCode.get(code)!),
  },
];

const defaultUsers: UserRecord[] = [
  {
    id: randomUUID(),
    username: 'admin',
    passwordHash: seedHash('admin123'),
    displayName: '系统管理员',
    mobile: '13800000000',
    email: 'admin@growthpilot.local',
    roles: ['admin'],
    campusIds: [settingsRepositorySeed.campusIdGsh, settingsRepositorySeed.campusIdNm],
    status: 'active',
  },
  {
    id: randomUUID(),
    username: 'teacher.zhang',
    passwordHash: seedHash('teacher123'),
    displayName: '张老师',
    mobile: '13800000001',
    email: 'teacher.zhang@growthpilot.local',
    roles: ['teacher'],
    campusIds: [settingsRepositorySeed.campusIdGsh],
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
  create(input: Omit<UserRecord, 'id'>): Promise<UserRecord>;
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

  async create(input: Omit<UserRecord, 'id'>) {
    return this.store.update((state) => {
      if (state.users.some((user) => user.username === input.username)) {
        throw new ConflictException({ code: 'DATA_409', message: 'username already exists' });
      }
      const user: UserRecord = {
        ...input,
        id: `user-${String(state.users.length + 1).padStart(3, '0')}`,
        roles: [...new Set(input.roles)],
        campusIds: [...new Set(input.campusIds)],
      };
      state.users.unshift(user);
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
      ? await this.db
        .select()
        .from(dbSchema.users)
        .where(or(ilike(dbSchema.users.displayName, `%${normalized}%`), ilike(dbSchema.users.username, `%${normalized}%`)))
        .orderBy(desc(dbSchema.users.createdAt))
      : await this.db.select().from(dbSchema.users).orderBy(desc(dbSchema.users.createdAt));

    return Promise.all(rows.map((row) => this.enrichUser(row))) as Promise<UserRecord[]>;
  }

  async listRoles() {
    const roleRows = await this.db.select().from(dbSchema.roles).orderBy(dbSchema.roles.code);
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
    const rows = await this.db.select().from(dbSchema.permissions).orderBy(dbSchema.permissions.code);
    return rows.map((row) => ({ id: row.id, code: row.code, name: row.name, module: row.module, action: row.action }));
  }

  async assignRoles(userId: string, roleCodes: string[]) {
    const roleRows = roleCodes.length
      ? await this.db.select().from(dbSchema.roles).where(inArray(dbSchema.roles.code, roleCodes))
      : [];
    const existing = await this.findById(userId);
    if (!existing) return undefined;
    const campusIds = await this.resolveCampusIds(existing.campusIds);

    await this.db.transaction(async (tx) => {
      await tx.delete(dbSchema.userRoles).where(eq(dbSchema.userRoles.userId, userId));
      if (roleRows.length) {
        await tx.insert(dbSchema.userRoles).values(
          roleRows.flatMap((role) =>
            (campusIds.length ? campusIds : [null]).map((campusId) => ({ userId, roleId: role.id, campusId })),
          ),
        );
      }
    });

    return this.findById(userId);
  }

  async create(input: Omit<UserRecord, 'id'>) {
    const duplicate = await this.db.select({ id: dbSchema.users.id }).from(dbSchema.users).where(eq(dbSchema.users.username, input.username)).limit(1);
    if (duplicate[0]) {
      throw new ConflictException({ code: 'DATA_409', message: 'username already exists' });
    }

    const roleRows = input.roles.length
      ? await this.db.select().from(dbSchema.roles).where(inArray(dbSchema.roles.code, input.roles))
      : [];
    const campusIds = await this.resolveCampusIds(input.campusIds);
    const now = new Date();
    const [created] = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(dbSchema.users)
        .values({
          username: input.username,
          passwordHash: input.passwordHash,
          displayName: input.displayName,
          mobile: input.mobile ?? null,
          email: input.email ?? null,
          status: input.status,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (roleRows.length) {
        await tx.insert(dbSchema.userRoles).values(
          roleRows.flatMap((role) =>
            (campusIds.length ? campusIds : [null]).map((campusId) => ({ userId: inserted[0]!.id, roleId: role.id, campusId })),
          ),
        );
      }
      return inserted;
    });

    return (await this.findById(created.id))!;
  }

  private async enrichUser(row: InferSelectModel<typeof dbSchema.users> | undefined) {
    if (!row) return undefined;

    const assignments = await this.db.select().from(dbSchema.userRoles).where(eq(dbSchema.userRoles.userId, row.id));
    const roleIds = assignments.map((assignment) => assignment.roleId);
    const roleRows = roleIds.length ? await this.db.select().from(dbSchema.roles).where(inArray(dbSchema.roles.id, roleIds)) : [];

    return {
      id: row.id,
      username: row.username,
      passwordHash: row.passwordHash,
      displayName: row.displayName,
      mobile: row.mobile ?? undefined,
      email: row.email ?? undefined,
      roles: roleRows.map((role) => role.code),
      campusIds: [...new Set(assignments.map((assignment) => assignment.campusId).filter((campusId): campusId is string => Boolean(campusId)))],
      status: row.status,
    } satisfies UserRecord;
  }

  private async resolveCampusIds(campusIds: string[]) {
    if (!campusIds.length) {
      return [];
    }

    const uniqueCampusIds = [...new Set(campusIds)];
    const campusRows = await this.db.select({ id: dbSchema.campuses.id }).from(dbSchema.campuses).where(inArray(dbSchema.campuses.id, uniqueCampusIds));
    if (campusRows.length !== uniqueCampusIds.length) {
      const existingCampusIds = new Set(campusRows.map((campus) => campus.id));
      const missingCampusIds = uniqueCampusIds.filter((campusId) => !existingCampusIds.has(campusId));
      throw new NotFoundException(`Campus ${missingCampusIds.join(', ')} not found`);
    }

    return uniqueCampusIds;
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

  create(input: Omit<UserRecord, 'id'>) {
    return this.adapter.create(input);
  }
}

export const usersRepositorySeed = {
  permissions: defaultPermissions,
  roles: defaultRoles,
  users: defaultUsers.map((user) => ({ ...user, id: user.id || randomUUID() })),
};
