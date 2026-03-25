import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationSql = readFileSync(new URL('../drizzle/0002_glorious_the_spike.sql', import.meta.url), 'utf8');
const migrationSnapshot = JSON.parse(
  readFileSync(new URL('../drizzle/meta/0002_snapshot.json', import.meta.url), 'utf8'),
) as {
  tables?: Record<
    string,
    {
      uniqueConstraints?: Record<string, { columns?: string[]; nullsNotDistinct?: boolean }>;
    }
  >;
};

test('auth session migration creates auth_sessions table', () => {
  assert.match(migrationSql, /CREATE TABLE "auth_sessions"/);
});

test('user_roles migration treats NULL campus bindings as duplicates', () => {
  assert.match(migrationSql, /UNIQUE NULLS NOT DISTINCT\("user_id","role_id","campus_id"\)/);

  const userRolesTable = migrationSnapshot.tables?.['public.user_roles'];
  const uniqueConstraint = userRolesTable?.uniqueConstraints?.['user_roles_user_role_campus_uq'];

  assert.deepEqual(uniqueConstraint?.columns, ['user_id', 'role_id', 'campus_id']);
  assert.equal(uniqueConstraint?.nullsNotDistinct, true);
});
