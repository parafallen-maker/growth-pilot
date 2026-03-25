import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { authSessions, campuses, permissions, roles, schoolTerms, systemDictionaries, userRoles, users } from './schema';

const now = new Date();
const currentYear = now.getUTCFullYear();
const nextYear = currentYear + 1;

export const defaultRoles = [
  { code: 'super_admin', name: 'Super Admin', scopeLevel: 'global', status: 'active' },
  { code: 'principal', name: 'Principal', scopeLevel: 'campus', status: 'active' },
  { code: 'teacher', name: 'Teacher', scopeLevel: 'teacher', status: 'active' },
  { code: 'finance', name: 'Finance', scopeLevel: 'campus', status: 'active' },
] as const;

export const defaultCampuses = [
  { code: 'main', name: '默认校区', timezone: 'Asia/Shanghai', status: 'active', sortOrder: 100 },
] as const;

export const defaultTerms = [
  {
    code: `${currentYear}-spring`,
    name: `${currentYear}春季学期`,
    startDate: `${currentYear}-02-01`,
    endDate: `${currentYear}-07-31`,
    status: 'active',
  },
  {
    code: `${currentYear}-autumn`,
    name: `${currentYear}秋季学期`,
    startDate: `${currentYear}-08-01`,
    endDate: `${nextYear}-01-31`,
    status: 'draft',
  },
] as const;

export const defaultDictionaries = [
  { dictType: 'grade_levels', code: 'g1', label: '一年级', value: 'G1', sortOrder: 10 },
  { dictType: 'grade_levels', code: 'g2', label: '二年级', value: 'G2', sortOrder: 20 },
  { dictType: 'subjects', code: 'math', label: '数学', value: 'math', sortOrder: 10 },
  { dictType: 'subjects', code: 'chinese', label: '语文', value: 'chinese', sortOrder: 20 },
  { dictType: 'subjects', code: 'english', label: '英语', value: 'english', sortOrder: 30 },
  { dictType: 'communication_channels', code: 'wechat', label: '微信', value: 'wechat', sortOrder: 10 },
  { dictType: 'communication_channels', code: 'phone', label: '电话', value: 'phone', sortOrder: 20 },
] as const;

export function buildSeedPlan() {
  const campusId = randomUUID();
  const adminRoleId = randomUUID();
  const teacherRoleId = randomUUID();
  const permissionRows = [
    { id: randomUUID(), code: 'auth.session.read', name: '读取会话信息', module: 'auth', action: 'read' },
    { id: randomUUID(), code: 'settings:view', name: '查看设置', module: 'settings', action: 'view' },
    { id: randomUUID(), code: 'jobs.read', name: '读取任务中心', module: 'jobs', action: 'read' },
    { id: randomUUID(), code: 'users:view', name: '查看用户', module: 'users', action: 'view' },
    { id: randomUUID(), code: 'users.read', name: '读取用户（兼容旧约定）', module: 'users', action: 'read' },
    { id: randomUUID(), code: 'users.role.bind', name: '绑定用户角色', module: 'users', action: 'bind' },
    { id: randomUUID(), code: 'teachers:view', name: '查看教师', module: 'teachers', action: 'view' },
    { id: randomUUID(), code: 'students:view', name: '查看学生', module: 'students', action: 'view' },
    { id: randomUUID(), code: 'families:view', name: '查看家庭', module: 'families', action: 'view' },
    { id: randomUUID(), code: 'analytics:overview:view', name: '查看总览分析', module: 'analytics', action: 'view' },
    { id: randomUUID(), code: 'analytics:teaching:view', name: '查看教学分析', module: 'analytics', action: 'view' },
    { id: randomUUID(), code: 'analytics:billing:view', name: '查看收费分析', module: 'analytics', action: 'view' },
    { id: randomUUID(), code: 'attendance:board:view', name: '查看签到看板', module: 'attendance', action: 'view' },
    { id: randomUUID(), code: 'attendance:board:manage', name: '管理签到事件', module: 'attendance', action: 'manage' },
    { id: randomUUID(), code: 'attendance:devices:view', name: '查看设备', module: 'attendance', action: 'view' },
    { id: randomUUID(), code: 'attendance:devices:manage', name: '管理设备', module: 'attendance', action: 'manage' },
    { id: randomUUID(), code: 'attendance:homework-time:view', name: '查看作业时长', module: 'attendance', action: 'view' },
    { id: randomUUID(), code: 'billing:products:view', name: '查看收费产品', module: 'billing', action: 'view' },
    { id: randomUUID(), code: 'billing:products:manage', name: '管理收费产品', module: 'billing', action: 'manage' },
    { id: randomUUID(), code: 'billing:contracts:view', name: '查看合同', module: 'billing', action: 'view' },
    { id: randomUUID(), code: 'billing:contracts:manage', name: '管理合同', module: 'billing', action: 'manage' },
    { id: randomUUID(), code: 'billing:invoices:view', name: '查看账单', module: 'billing', action: 'view' },
    { id: randomUUID(), code: 'billing:payments:manage', name: '管理收款', module: 'billing', action: 'manage' },
    { id: randomUUID(), code: 'billing:refunds:manage', name: '管理退款', module: 'billing', action: 'manage' },
    { id: randomUUID(), code: 'billing:renewals:view', name: '查看续费', module: 'billing', action: 'view' },
    { id: randomUUID(), code: 'billing:renewals:manage', name: '管理续费', module: 'billing', action: 'manage' },
    { id: randomUUID(), code: 'communication:records:view', name: '查看沟通记录', module: 'communication', action: 'view' },
    { id: randomUUID(), code: 'communication:records:manage', name: '管理沟通记录', module: 'communication', action: 'manage' },
    { id: randomUUID(), code: 'communication:templates:view', name: '查看消息模板', module: 'communication', action: 'view' },
    { id: randomUUID(), code: 'communication:templates:manage', name: '管理消息模板', module: 'communication', action: 'manage' },
    { id: randomUUID(), code: 'communication:messages:view', name: '查看消息任务', module: 'communication', action: 'view' },
    { id: randomUUID(), code: 'communication:messages:manage', name: '管理消息任务', module: 'communication', action: 'manage' },
  ];
  const adminUserId = randomUUID();
  const teacherUserId = randomUUID();

  return {
    campuses: defaultCampuses.map((campus) => ({ id: campusId, ...campus })),
    roles: [
      { id: adminRoleId, code: 'admin', name: '系统管理员', scopeLevel: 'system', status: 'active' },
      { id: teacherRoleId, code: 'teacher', name: '任课老师', scopeLevel: 'campus', status: 'active' },
      ...defaultRoles.map((role) => ({ id: randomUUID(), ...role })),
    ],
    permissions: permissionRows,
    users: [
      {
        id: adminUserId,
        username: 'admin',
        passwordHash: 'admin123',
        displayName: '系统管理员',
        mobile: '13800000000',
        email: 'admin@growthpilot.local',
        status: 'active',
      },
      {
        id: teacherUserId,
        username: 'teacher.zhang',
        passwordHash: 'teacher123',
        displayName: '张老师',
        mobile: '13800000001',
        email: 'teacher.zhang@growthpilot.local',
        status: 'active',
      },
    ],
    userRoles: [
      { userId: adminUserId, roleId: adminRoleId, campusId },
      { userId: teacherUserId, roleId: teacherRoleId, campusId },
    ],
    schoolTerms: defaultTerms.map((term) => ({ id: randomUUID(), campusId, ...term })),
    systemDictionaries: defaultDictionaries.map((item) => ({
      id: randomUUID(),
      ...item,
      active: 1,
      extra: {},
    })),
    authSessions: [] as typeof authSessions.$inferInsert[],
  };
}

export async function seedDatabase(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run seed');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  const plan = buildSeedPlan();

  try {
    await db.insert(campuses).values(plan.campuses).onConflictDoNothing();
    await db.insert(roles).values(plan.roles).onConflictDoNothing();
    await db.insert(permissions).values(plan.permissions).onConflictDoNothing();
    await db.insert(users).values(plan.users).onConflictDoNothing();
    await db.insert(userRoles).values(plan.userRoles).onConflictDoNothing();
    await db.insert(schoolTerms).values(plan.schoolTerms).onConflictDoNothing();
    await db.insert(systemDictionaries).values(plan.systemDictionaries).onConflictDoNothing();
  } finally {
    await pool.end();
  }

  return {
    campuses: plan.campuses.length,
    roles: plan.roles.length,
    permissions: plan.permissions.length,
    users: plan.users.length,
    userRoles: plan.userRoles.length,
    schoolTerms: plan.schoolTerms.length,
    systemDictionaries: plan.systemDictionaries.length,
  };
}

if (require.main === module) {
  seedDatabase()
    .then((result) => {
      console.log('Seed completed', result);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
