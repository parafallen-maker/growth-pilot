import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SettingsController } from '../../src/modules/settings/controller/settings.controller';
import { SettingsRepository } from '../../src/modules/settings/repository/settings.repository';
import { SettingsService } from '../../src/modules/settings/service/settings.service';
import { UsersController } from '../../src/modules/users/controller/users.controller';
import { UsersRepository } from '../../src/modules/users/repository/users.repository';
import { UsersService } from '../../src/modules/users/service/users.service';
import { JobsController } from '../../src/modules/jobs/controller/jobs.controller';
import { JobsRepository } from '../../src/modules/jobs/repository/jobs.repository';
import { JobsService } from '../../src/modules/jobs/service/jobs.service';
import { StudentsController } from '../../src/modules/students/students.controller';
import { FamiliesController } from '../../src/modules/families/families.controller';
import { HomeworkController } from '../../src/modules/homework/controller/homework.controller';
import { GrowthController } from '../../src/modules/growth/controller/growth.controller';
import { AuthController } from '../../src/modules/auth/controller/auth.controller';
import { createQaFixture } from './e2e-main-flow.fixture';

const openApiText = readFileSync(resolve(process.cwd(), '../../docs/growthpilot/07_OpenAPI.yaml'), 'utf8');

function assertOpenApiPath(path: string, method: string) {
  assert.match(openApiText, new RegExp(`^  ${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:$`, 'm'));
  assert.match(openApiText, new RegExp(`^\
${method.toLowerCase()}:`, 'm'));
}

function assertEnvelope<T>(payload: { code: string; message: string; data: T; traceId: string }) {
  assert.equal(payload.code, 'OK');
  assert.equal(payload.message, 'success');
  assert.ok(payload.traceId);
  return payload.data;
}

test('QA-06 OpenAPI contract smoke covers auth, settings, users, students, families, homework, growth, jobs', async () => {
  const fixture = createQaFixture();

  const authController = new AuthController(fixture.authService);
  const settingsController = new SettingsController(new SettingsService(new SettingsRepository()));
  const usersController = new UsersController(new UsersService(new UsersRepository()));
  const jobsController = new JobsController(new JobsService(new JobsRepository()));
  const studentsController = new StudentsController(fixture.studentsService);
  const familiesController = new FamiliesController(fixture.familiesService);
  const homeworkController = new HomeworkController(fixture.homeworkService);
  const growthController = new GrowthController(fixture.growthService);

  assert.match(openApiText, /\/auth\/login:/);
  const login = assertEnvelope(await authController.login({ username: 'admin', password: 'admin123' }));
  assert.equal(login.user.username, 'admin');
  assert.ok(login.accessToken);
  assert.ok(login.refreshToken);

  assert.match(openApiText, /\/auth\/me:/);
  const me = assertEnvelope(await authController.currentUser(`Bearer ${login.accessToken}`));
  assert.ok(me.permissions.includes('jobs.read'));

  assert.match(openApiText, /\/settings\/campuses:/);
  const campuses = assertEnvelope(await settingsController.listCampuses());
  assert.ok(Array.isArray(campuses.list));
  assert.equal(typeof campuses.page.total, 'number');

  assert.match(openApiText, /\/users:/);
  const users = assertEnvelope(await usersController.listUsers(undefined, '1', '20'));
  assert.ok(Array.isArray(users.list));
  assert.equal(users.page.pageNo, 1);
  assert.equal(users.page.pageSize, 20);

  assert.match(openApiText, /\/students:/);
  const students = assertEnvelope(await studentsController.list({ pageNo: 1, pageSize: 20 }));
  const studentId = students.list[0]?.id;
  assert.ok(studentId);
  assert.equal(students.page.pageNo, 1);

  assert.match(openApiText, /\/students\/\{studentId\}:/);
  assert.equal(assertEnvelope(await studentsController.detail(studentId!)).id, studentId);
  assert.equal(assertEnvelope(await studentsController.detail360(studentId!)).student.id, studentId);

  assert.match(openApiText, /\/families:/);
  const families = assertEnvelope(await familiesController.list({ pageNo: 1, pageSize: 20 }));
  const familyId = families.list[0]?.id;
  assert.ok(familyId);
  assert.equal(assertEnvelope(await familiesController.detail(familyId!)).family.id, familyId);

  assert.match(openApiText, /\/homework\/submissions:/);
  const submissions = assertEnvelope(await homeworkController.listSubmissions({ pageNo: 1, pageSize: 20 }));
  const submissionId = submissions.list[0]?.id;
  assert.ok(submissionId);
  assert.equal(assertEnvelope(await homeworkController.getSubmissionDetail(submissionId!)).submission.id, submissionId);

  assert.match(openApiText, /\/growth\/rubrics:/);
  const rubrics = assertEnvelope(await growthController.listRubrics({ pageNo: 1, pageSize: 20 }));
  const rubricId = rubrics.list[0]?.id;
  assert.ok(rubricId);
  assert.equal(assertEnvelope(await growthController.getRubric(rubricId!)).id, rubricId);

  const reports = assertEnvelope(await growthController.listReports({ pageNo: 1, pageSize: 20 }));
  assert.ok(Array.isArray(reports.list));
  assert.equal(reports.page.pageNo, 1);

  assert.match(openApiText, /\/jobs:/);
  const jobs = assertEnvelope(await jobsController.listJobs('running'));
  assert.ok(Array.isArray(jobs.list));

  const refreshed = assertEnvelope(await authController.refresh({ refreshToken: login.refreshToken }));
  assert.ok(refreshed.accessToken);
  assert.ok(refreshed.refreshToken);
  assert.deepEqual(assertEnvelope(await authController.logout(`Bearer ${refreshed.accessToken}`, { refreshToken: refreshed.refreshToken })), {});
});
