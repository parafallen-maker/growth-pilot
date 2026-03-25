import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';

test('QA-01 学生建档链：login -> family -> guardian -> student -> enrollment -> teacher assignment -> 360 executable', async (t) => {
  const { authService, familiesService, studentsService } = createQaFixture();

  await t.test('smoke: login + create family/guardian/student/enrollment and query 360 aggregate', async () => {
    const login = await authService.login('admin', 'admin123');
    const currentUser = await authService.currentUser(login.accessToken);
    const family = await familiesService.create({
      familyName: '测试家庭',
      primaryContactName: '张妈妈',
      primaryMobile: '13900001234',
      familyStructure: 'nuclear',
    });
    const guardian = await familiesService.createGuardian(family.id, {
      name: '张妈妈',
      relation: 'mother',
      mobile: '13900001234',
      isPrimary: true,
      isEmergency: true,
    });
    const student = await studentsService.create({
      studentNo: 'S-QA-001',
      name: '测试学生',
      gender: 'male',
      schoolName: 'QA 小学',
      gradeLabel: '一年级',
      className: '1班',
      familyId: family.id,
    });
    const enrollment = await studentsService.createEnrollment(student.id, {
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      primaryTeacherId: 'teacher-001',
      enrollDate: '2026-03-25',
      status: 'active',
    });

    const aggregate = await studentsService.detail360(student.id);
    assert.equal(currentUser.username, 'admin');
    assert.equal(guardian.familyId, family.id);
    assert.equal(enrollment.studentId, student.id);
    assert.equal(enrollment.primaryTeacherId, 'teacher-001');
    assert.equal(aggregate.student.id, student.id);
    assert.equal(aggregate.currentEnrollment?.campusId, 'campus-001');
  });

  await t.test('case-student-360-filters-and-family-join-are-queryable', async () => {
    const family = await familiesService.create({
      familyName: '过滤家庭',
      primaryContactName: '李爸爸',
      primaryMobile: '13900005555',
      familyStructure: 'nuclear',
    });
    const student = await studentsService.create({
      studentNo: 'S-QA-002',
      name: '过滤学生',
      gender: 'female',
      schoolName: 'QA 小学',
      gradeLabel: '二年级',
      className: '2班',
      familyId: family.id,
    });
    await studentsService.createEnrollment(student.id, {
      campusId: 'campus-002',
      termId: 'term-2026-spring',
      primaryTeacherId: 'teacher-001',
      enrollDate: '2026-03-26',
      status: 'active',
    });

    const listByCampus = await studentsService.list({ campusId: 'campus-002', pageNo: 1, pageSize: 20 });
    const detail360 = await studentsService.detail360(student.id);

    assert.equal(listByCampus.list[0]?.studentNo, 'S-QA-002');
    assert.equal(detail360.family?.id, family.id);
    assert.equal(detail360.guardians.length, 0);
    assert.ok(detail360.recentTimeline.some((item) => item.type === 'enrollment'));
    assert.equal(detail360.recentTimeline[0]?.type, 'student');
  });

  await t.test('case-cross-term-enrollment-history-keeps-active-current-enrollment', async () => {
    const family = await familiesService.create({
      familyName: '历史家庭',
      primaryContactName: '王妈妈',
      primaryMobile: '13900006666',
      familyStructure: 'nuclear',
    });
    const student = await studentsService.create({
      studentNo: 'S-QA-003',
      name: '历史学生',
      gender: 'male',
      schoolName: 'QA 小学',
      gradeLabel: '三年级',
      className: '1班',
      familyId: family.id,
    });
    await studentsService.createEnrollment(student.id, {
      campusId: 'campus-001',
      termId: 'term-2025-fall',
      primaryTeacherId: 'teacher-001',
      enrollDate: '2025-09-01',
      leaveDate: '2026-01-20',
      status: 'graduated',
    });
    await studentsService.createEnrollment(student.id, {
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      primaryTeacherId: 'teacher-001',
      enrollDate: '2026-02-20',
      status: 'active',
    });

    const detail360 = await studentsService.detail360(student.id);
    const enrollments = await studentsService.listEnrollmentsByStudent(student.id);

    assert.equal(enrollments.length, 2);
    assert.equal(detail360.currentEnrollment?.termId, 'term-2026-spring');
    assert.equal(detail360.recentTimeline.filter((item) => item.type === 'enrollment').length, 1);
  });
});
