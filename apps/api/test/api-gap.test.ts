import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { FamiliesRepository } from '../src/modules/families/repository/families.repository';
import { FamiliesService } from '../src/modules/families/families.service';
import { GrowthRepository } from '../src/modules/growth/repository/growth.repository';
import { HomeworkRepository } from '../src/modules/homework/repository/homework.repository';
import { JobsRepository } from '../src/modules/jobs/repository/jobs.repository';
import { JobsService } from '../src/modules/jobs/service/jobs.service';
import { MasterDataStore } from '../src/modules/master-data/master-data.store';
import { AttendanceRepository } from '../src/modules/attendance/repository/attendance.repository';
import { BillingRepository } from '../src/modules/billing/repository/billing.repository';
import { StudentsRepository } from '../src/modules/students/repository/students.repository';
import { StudentsService } from '../src/modules/students/students.service';
import { TeachersRepository } from '../src/modules/teachers/repository/teachers.repository';
import { TeachersService } from '../src/modules/teachers/teachers.service';
import { UsersRepository } from '../src/modules/users/repository/users.repository';
import { UsersService } from '../src/modules/users/service/users.service';
import { PasswordService } from '../src/common/security';

const dataDir = resolve(process.cwd(), '.data');
const runtimeDir = resolve(process.cwd(), '.runtime');

function resetPersistence() {
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(runtimeDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(runtimeDir, { recursive: true });
  process.env.GROWTHPILOT_MASTER_DATA_PATH = resolve(runtimeDir, 'master-data.json');
}

function createFixture() {
  resetPersistence();
  const masterDataStore = new MasterDataStore();
  masterDataStore.reset();

  const jobsService = new JobsService(new JobsRepository());
  const familiesRepository = new FamiliesRepository(masterDataStore);
  const teachersRepository = new TeachersRepository(masterDataStore);
  const studentsRepository = new StudentsRepository(masterDataStore);
  const usersRepository = new UsersRepository();
  const homeworkRepository = new HomeworkRepository();
  const growthRepository = new GrowthRepository();
  const attendanceRepository = new AttendanceRepository();
  const billingRepository = new BillingRepository();

  return {
    familiesService: new FamiliesService(familiesRepository),
    teachersService: new TeachersService(teachersRepository),
    studentsService: new StudentsService(
      studentsRepository,
      familiesRepository,
      homeworkRepository,
      growthRepository,
      attendanceRepository,
      billingRepository,
      jobsService,
    ),
    usersService: new UsersService(usersRepository, new PasswordService()),
  };
}

test('student import parses csv and returns completed job payload', async () => {
  const { studentsService } = createFixture();

  const job = await studentsService.importStudents({
    fileName: 'students.csv',
    content: [
      'studentNo,name,gradeLabel,familyCode',
      'S900,导入学生,二年级,F001',
      'S001,重复学号,一年级,F001',
    ].join('\n'),
  });

  assert.equal(job.status, 'success');
  assert.equal(job.jobType, 'students_import');
  assert.equal(job.result?.totalRows, 2);
  assert.equal(job.result?.validRows, 1);
  assert.equal(job.result?.invalidRows, 1);
  assert.deepEqual(job.result?.duplicateStudentNos, ['S001']);
});

test('family tasks and teacher development records persist through detail views', async () => {
  const { familiesService, teachersService } = createFixture();

  const task = await familiesService.createTask('family-001', {
    studentId: 'student-001',
    assigneeGuardianId: 'guardian-001',
    title: '每天检查作业清单',
    frequency: 'daily',
    dueDate: '2026-03-31',
  }, 'user-admin-001');
  assert.equal(task.familyId, 'family-001');
  assert.equal(task.createdBy, 'user-admin-001');

  const familyDetail = await familiesService.detail('family-001');
  assert.equal(familyDetail.tasks.length, 1);
  assert.equal(familyDetail.tasks[0]?.id, task.id);

  const record = await teachersService.createDevelopmentRecord('teacher-001', {
    recordType: 'class_observation',
    title: '三月课堂观察',
    occurredAt: '2026-03-25T10:00:00.000Z',
    strengths: '课堂节奏稳定',
    improvements: '提问等待时间可再延长',
  }, 'user-admin-001');
  assert.equal(record.teacherId, 'teacher-001');
  assert.equal(record.createdBy, 'user-admin-001');

  const teacherDetail = await teachersService.detail('teacher-001');
  assert.equal(teacherDetail.developmentRecords.length, 1);
  assert.equal(teacherDetail.developmentRecords[0]?.id, record.id);
});

test('admin create user persists with requested role bindings', async () => {
  const { usersService } = createFixture();

  const created = await usersService.createUser({
    username: 'new.teacher',
    password: 'teacher123',
    displayName: '新老师',
    roleIds: ['teacher'],
    campusIds: ['campus-guanshanhu'],
  });

  assert.equal(created.username, 'new.teacher');
  assert.deepEqual(created.roles, ['teacher']);
  assert.deepEqual(created.campusIds, ['campus-guanshanhu']);

  const profile = await usersService.getCurrentUserProfile('user-003');
  assert.ok(profile.permissions.includes('teachers:view'));
});
