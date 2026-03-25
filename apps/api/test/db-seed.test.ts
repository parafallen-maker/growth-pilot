import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedPlan } from '../src/db/seed';

test('db seed plan stays aligned with users/settings repository defaults', () => {
  const plan = buildSeedPlan();

  assert.deepEqual(
    plan.campuses.map((campus) => campus.id),
    ['campus-guanshanhu', 'campus-nanming'],
  );

  assert.deepEqual(
    plan.schoolTerms.map((term) => term.id),
    ['term-2026-spring-gsh', 'term-2026-spring-nm'],
  );

  const permissionIds = new Set(plan.permissions.map((permission) => permission.id));
  assert.ok(permissionIds.has('perm-auth-session-read'));
  assert.ok(permissionIds.has('perm-users-role-bind'));
  assert.ok(permissionIds.has('perm-teachers-view'));

  const adminUser = plan.users.find((user) => user.username === 'admin');
  assert.ok(adminUser);

  const adminRoleAssignments = plan.userRoles.filter((assignment) => assignment.userId === adminUser!.id);
  assert.deepEqual(
    adminRoleAssignments.map((assignment) => assignment.campusId).sort(),
    ['campus-guanshanhu', 'campus-nanming'],
  );

  const jobStatusDict = plan.systemDictionaries.filter((item) => item.dictType === 'job_status');
  assert.equal(jobStatusDict.length, 2);
});
