import test from 'node:test';
import assert from 'node:assert/strict';
import { StudentsService } from '../src/modules/students/students.service';

function createFixture() {
  return new StudentsService();
}

test('student list/detail/enrollment skeleton works', () => {
  const service = createFixture();

  const page = service.list({ pageNo: 1, pageSize: 20, status: 'active' });
  assert.equal(page.list.length, 1);
  assert.equal(page.page.total, 1);

  const student = service.detail('student-001');
  assert.equal(student.name, '小明');

  const enrollment = service.createEnrollment('student-001', {
    campusId: 'campus-002',
    termId: 'term-2026-summer',
    primaryTeacherId: 'teacher-002',
    enrollDate: '2026-06-01',
    status: 'active',
  });
  assert.equal(enrollment.studentId, 'student-001');
  assert.equal(service.listEnrollmentsByStudent('student-001').length, 2);
});

test('student 360 aggregate returns summary skeleton for frontend', () => {
  const service = createFixture();

  const detail360 = service.detail360('student-001');

  assert.equal(detail360.student.id, 'student-001');
  assert.equal(detail360.currentEnrollment?.id, 'enrollment-001');
  assert.equal(detail360.family?.id, 'family-001');
  assert.equal(detail360.guardians.length, 2);

  assert.equal(detail360.homeworkSummary.reviewedCount, 1);
  assert.equal(detail360.homeworkSummary.pendingReviewCount, 1);
  assert.equal(detail360.growthSummary.activeGoalCount, 2);
  assert.equal(detail360.attendanceSummary.presentDays, 2);
  assert.equal(detail360.billingSummary.outstandingAmount, 1200);
  assert.equal(detail360.recentTimeline.length > 0, true);
  assert.equal(detail360.recentTimeline[0]?.occurredAt >= detail360.recentTimeline[1]?.occurredAt!, true);
});
