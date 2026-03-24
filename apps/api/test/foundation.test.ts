import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../src/modules/auth/service/auth.service';
import { JobsRepository } from '../src/modules/jobs/repository/jobs.repository';
import { JobsService } from '../src/modules/jobs/service/jobs.service';
import { SettingsRepository } from '../src/modules/settings/repository/settings.repository';
import { SettingsService } from '../src/modules/settings/service/settings.service';
import { UsersRepository } from '../src/modules/users/repository/users.repository';
import { UsersService } from '../src/modules/users/service/users.service';

function createFixture() {
  const usersRepository = new UsersRepository();
  const usersService = new UsersService(usersRepository);
  const authService = new AuthService(usersService);
  const settingsService = new SettingsService(new SettingsRepository());
  const jobsService = new JobsService(new JobsRepository());

  return {
    usersService,
    authService,
    settingsService,
    jobsService,
  };
}

test('auth login -> current user -> refresh -> logout closes session', () => {
  const { authService } = createFixture();

  const loginResult = authService.login('admin', 'admin123');
  assert.ok(loginResult.accessToken);
  assert.ok(loginResult.refreshToken);
  assert.equal(loginResult.user.username, 'admin');

  const currentUser = authService.currentUser(loginResult.accessToken);
  assert.deepEqual(currentUser.roles, ['admin']);
  assert.ok(currentUser.permissions.includes('jobs.read'));
  assert.ok(currentUser.permissions.includes('users.role.bind'));

  const refreshResult = authService.refresh(loginResult.refreshToken);
  assert.ok(refreshResult.accessToken.startsWith('access-'));

  authService.logout(loginResult.accessToken, loginResult.refreshToken);
  assert.throws(() => authService.currentUser(loginResult.accessToken));
  assert.throws(() => authService.refresh(loginResult.refreshToken));
});

test('settings queries return filtered mock data aligned with list shape', () => {
  const { settingsService } = createFixture();

  const campuses = settingsService.listCampuses();
  assert.equal(campuses.list.length, 2);
  assert.equal(campuses.page.total, 2);

  const terms = settingsService.listTerms('campus-guanshanhu');
  assert.equal(terms.list.length, 1);
  assert.equal(terms.list[0]?.campusId, 'campus-guanshanhu');

  const dictionaries = settingsService.listDictionaries('job_status');
  assert.equal(dictionaries.list.length, 2);
  assert.equal(dictionaries.list[0]?.dictType, 'job_status');
});

test('jobs and user role assignment skeleton are available', () => {
  const { jobsService, usersService } = createFixture();

  const job = jobsService.getJob('job-homework-analysis-001');
  assert.equal(job.status, 'running');
  assert.equal(job.jobId, 'job-homework-analysis-001');

  const before = usersService.getCurrentUserProfile('user-teacher-001');
  assert.deepEqual(before.roles, ['teacher']);

  usersService.assignRoles('user-teacher-001', ['admin']);
  const after = usersService.getCurrentUserProfile('user-teacher-001');
  assert.deepEqual(after.roles, ['admin']);
  assert.ok(after.permissions.includes('jobs.read'));
});
