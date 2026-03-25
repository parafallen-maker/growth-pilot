import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AttendanceRepository } from '../src/modules/attendance/repository/attendance.repository';
import { BillingRepository } from '../src/modules/billing/repository/billing.repository';
import { FamiliesRepository } from '../src/modules/families/repository/families.repository';
import { FamiliesService } from '../src/modules/families/families.service';
import { GrowthRepository } from '../src/modules/growth/repository/growth.repository';
import { HomeworkRepository } from '../src/modules/homework/repository/homework.repository';
import { MasterDataStore } from '../src/modules/master-data/master-data.store';
import { StudentsRepository } from '../src/modules/students/repository/students.repository';
import { StudentsService } from '../src/modules/students/students.service';

function buildServices(storePath?: string) {
  const filePath = storePath ?? join(mkdtempSync(join(tmpdir(), 'growthpilot-master-data-')), 'master-data.json');
  const dir = filePath.slice(0, filePath.lastIndexOf('/'));
  const store = new MasterDataStore(filePath);
  if (!storePath) {
    store.reset();
  }
  const familiesRepository = new FamiliesRepository(store);
  const studentsRepository = new StudentsRepository(store);
  const homeworkRepository = new HomeworkRepository(join(dir, 'homework.json'));
  const growthRepository = new GrowthRepository(join(dir, 'growth.json'));
  const attendanceRepository = new AttendanceRepository(join(dir, 'attendance.json'));
  const billingRepository = new BillingRepository(join(dir, 'billing.json'));
  return {
    filePath,
    familiesService: new FamiliesService(familiesRepository),
    service: new StudentsService(studentsRepository, familiesRepository, homeworkRepository, growthRepository, attendanceRepository, billingRepository),
  };
}

test('student list/detail/enrollment persistence works', async () => {
  const fixture = buildServices();
  const { service, filePath } = fixture;

  const page = await service.list({ pageNo: 1, pageSize: 20, status: 'active' });
  assert.equal(page.list.length, 1);
  assert.equal(page.page.total, 1);

  const student = await service.detail('student-001');
  assert.equal(student.name, '小明');

  const enrollment = await service.createEnrollment('student-001', {
    campusId: 'campus-002',
    termId: 'term-2026-summer',
    primaryTeacherId: 'teacher-001',
    enrollDate: '2026-06-01',
    status: 'active',
  });
  assert.equal(enrollment.studentId, 'student-001');
  assert.equal((await service.listEnrollmentsByStudent('student-001')).length, 2);

  const reloaded = buildServices(filePath).service;
  assert.equal((await reloaded.listEnrollmentsByStudent('student-001')).length, 2);
});

test('student 360 aggregate reads persisted student/family/enrollment data', async () => {
  const { service } = buildServices();

  const detail360 = await service.detail360('student-001');

  assert.equal(detail360.student.id, 'student-001');
  assert.equal(detail360.currentEnrollment?.id, 'enrollment-001');
  assert.equal(detail360.family?.id, 'family-001');
  assert.equal(detail360.guardians.length, 2);
  assert.equal(detail360.recentTimeline.some((item) => item.type === 'student'), true);
  assert.equal(detail360.recentTimeline.some((item) => item.type === 'family'), true);
  assert.equal(detail360.recentTimeline.some((item) => item.type === 'enrollment'), true);

  assert.equal(detail360.homeworkSummary.reviewedCount, 1);
  assert.equal(detail360.homeworkSummary.pendingReviewCount, 0);
  assert.equal(detail360.growthSummary.activeGoalCount, 1);
  assert.equal(detail360.attendanceSummary.presentDays, 1);
  assert.equal(detail360.billingSummary.outstandingAmount, 360000);
});

test('master-data uniqueness rules are enforced via persisted repositories', async () => {
  const { service, familiesService } = buildServices();

  await assert.rejects(() =>
    service.create({
      studentNo: 'S001',
      name: '重复学号',
      gradeLabel: '一年级',
    }),
  );

  await assert.rejects(() =>
    familiesService.create({
      familyCode: 'F001',
      familyName: '重复家庭',
    }),
  );

  await assert.rejects(() =>
    service.createEnrollment('student-001', {
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      enrollDate: '2026-02-18',
      status: 'active',
    }),
  );
});
