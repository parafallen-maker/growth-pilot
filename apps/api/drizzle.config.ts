import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './src/db/schema/settings.ts',
    './src/db/schema/users.ts',
    './src/db/schema/auth.ts',
    './src/db/schema/families.ts',
    './src/db/schema/teachers.ts',
    './src/db/schema/students.ts',
    './src/db/schema/jobs.ts',
    './src/db/schema/workflow.ts',
    './src/db/schema/homework.ts',
    './src/db/schema/growth.ts',
    './src/db/schema/attendance.ts',
    './src/db/schema/billing.ts',
    './src/db/schema/communication.ts',
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://gp:gp_dev@localhost:5432/growthpilot',
  },
  verbose: true,
  strict: true,
});
