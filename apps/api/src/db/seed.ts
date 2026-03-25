import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { campuses, roles, schoolTerms, systemDictionaries } from './schema';

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

  return {
    campuses: defaultCampuses.map((campus) => ({ id: campusId, ...campus })),
    roles: defaultRoles.map((role) => ({ id: randomUUID(), ...role })),
    schoolTerms: defaultTerms.map((term) => ({ id: randomUUID(), campusId, ...term })),
    systemDictionaries: defaultDictionaries.map((item) => ({
      id: randomUUID(),
      ...item,
      active: 1,
      extra: {},
    })),
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
    await db.insert(schoolTerms).values(plan.schoolTerms).onConflictDoNothing();
    await db.insert(systemDictionaries).values(plan.systemDictionaries).onConflictDoNothing();
  } finally {
    await pool.end();
  }

  return {
    campuses: plan.campuses.length,
    roles: plan.roles.length,
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
