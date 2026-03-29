import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const authMigrationSql = readFileSync(new URL('../drizzle/0002_glorious_the_spike.sql', import.meta.url), 'utf8');
const authMigrationSnapshot = JSON.parse(
  readFileSync(new URL('../drizzle/meta/0002_snapshot.json', import.meta.url), 'utf8'),
) as {
  tables?: Record<
    string,
    {
      uniqueConstraints?: Record<string, { columns?: string[]; nullsNotDistinct?: boolean }>;
    }
  >;
};
const paginationMigrationSql = readFileSync(new URL('../drizzle/0003_married_tinkerer.sql', import.meta.url), 'utf8');
const workflowMigrationSql = readFileSync(new URL('../drizzle/0004_tasks-alerts-db-cutover.sql', import.meta.url), 'utf8');
const paginationMigrationSnapshot = JSON.parse(
  readFileSync(new URL('../drizzle/meta/0003_snapshot.json', import.meta.url), 'utf8'),
) as {
  tables?: Record<
    string,
    {
      indexes?: Record<string, { columns?: Array<{ expression?: string }> }>;
    }
  >;
};

test('auth session migration creates auth_sessions table', () => {
  assert.match(authMigrationSql, /CREATE TABLE "auth_sessions"/);
});

test('user_roles migration treats NULL campus bindings as duplicates', () => {
  assert.match(authMigrationSql, /UNIQUE NULLS NOT DISTINCT\("user_id","role_id","campus_id"\)/);

  const userRolesTable = authMigrationSnapshot.tables?.['public.user_roles'];
  const uniqueConstraint = userRolesTable?.uniqueConstraints?.['user_roles_user_role_campus_uq'];

  assert.deepEqual(uniqueConstraint?.columns, ['user_id', 'role_id', 'campus_id']);
  assert.equal(uniqueConstraint?.nullsNotDistinct, true);
});

test('pagination index migration lands high-frequency student, homework, and growth indexes', () => {
  for (const indexName of [
    'students_home_campus_status_idx',
    'student_enrollments_campus_term_status_idx',
    'homework_submissions_campus_term_status_idx',
    'homework_submissions_teacher_status_idx',
    'growth_observations_student_date_idx',
    'growth_goals_student_status_idx',
    'growth_reports_term_status_idx',
    'rubric_templates_campus_term_status_idx',
  ]) {
    assert.match(paginationMigrationSql, new RegExp(`CREATE INDEX "${indexName}"`));
  }
});

test('workflow cutover migration creates tasks + alerts tables and indexes', () => {
  for (const statement of [
    'CREATE TABLE "tasks"',
    'CREATE TABLE "alerts"',
    'CREATE INDEX "tasks_owner_status_due_idx"',
    'CREATE INDEX "alerts_status_level_created_idx"',
  ]) {
    assert.match(workflowMigrationSql, new RegExp(statement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('pagination index snapshot records the expected lookup columns', () => {
  const studentsTable = paginationMigrationSnapshot.tables?.['public.students'];
  const enrollmentsTable = paginationMigrationSnapshot.tables?.['public.student_enrollments'];
  const homeworkTable = paginationMigrationSnapshot.tables?.['public.homework_submissions'];
  const observationsTable = paginationMigrationSnapshot.tables?.['public.growth_observations'];
  const goalsTable = paginationMigrationSnapshot.tables?.['public.growth_goals'];
  const reportsTable = paginationMigrationSnapshot.tables?.['public.growth_reports'];
  const rubricTemplatesTable = paginationMigrationSnapshot.tables?.['public.rubric_templates'];

  assert.deepEqual(
    studentsTable?.indexes?.['students_home_campus_status_idx']?.columns?.map((column) => column.expression),
    ['home_campus_id', 'status'],
  );
  assert.deepEqual(
    enrollmentsTable?.indexes?.['student_enrollments_campus_term_status_idx']?.columns?.map((column) => column.expression),
    ['campus_id', 'term_id', 'status'],
  );
  assert.deepEqual(
    homeworkTable?.indexes?.['homework_submissions_campus_term_status_idx']?.columns?.map((column) => column.expression),
    ['campus_id', 'term_id', 'review_status'],
  );
  assert.deepEqual(
    homeworkTable?.indexes?.['homework_submissions_teacher_status_idx']?.columns?.map((column) => column.expression),
    ['teacher_id', 'ai_status'],
  );
  assert.deepEqual(
    observationsTable?.indexes?.['growth_observations_student_date_idx']?.columns?.map((column) => column.expression),
    ['student_id', 'observation_date'],
  );
  assert.deepEqual(
    goalsTable?.indexes?.['growth_goals_student_status_idx']?.columns?.map((column) => column.expression),
    ['student_id', 'status'],
  );
  assert.deepEqual(
    reportsTable?.indexes?.['growth_reports_term_status_idx']?.columns?.map((column) => column.expression),
    ['term_id', 'status'],
  );
  assert.deepEqual(
    rubricTemplatesTable?.indexes?.['rubric_templates_campus_term_status_idx']?.columns?.map((column) => column.expression),
    ['campus_id', 'term_id', 'status'],
  );
});
