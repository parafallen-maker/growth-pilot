import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';

test('E2E-02 学生建档闭环：家庭 -> 学生 -> enrollment -> student360 skeleton', async (t) => {
  const { familiesService, studentsService } = createQaFixture();

  await t.test('smoke: create family/student/enrollment and query 360 aggregate', () => {
    const family = familiesService.create({
      familyName: '测试家庭',
      primaryContactName: '张妈妈',
      primaryMobile: '13900001234',
      familyStructure: 'nuclear',
    });
    const guardian = familiesService.createGuardian(family.id, {
      name: '张妈妈',
      relation: 'mother',
      mobile: '13900001234',
      isPrimary: true,
      isEmergency: true,
    });
    const student = studentsService.create({
      studentNo: 'S-QA-001',
      name: '测试学生',
      gender: 'male',
      schoolName: 'QA 小学',
      gradeLabel: '一年级',
      className: '1班',
      familyId: family.id,
    });
    const enrollment = studentsService.createEnrollment(student.id, {
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      primaryTeacherId: 'teacher-001',
      enrollDate: '2026-03-25',
      status: 'active',
    });

    const aggregate = studentsService.detail360(student.id);
    assert.equal(guardian.familyId, family.id);
    assert.equal(enrollment.studentId, student.id);
    assert.equal(aggregate.student.id, student.id);
    assert.equal(aggregate.currentEnrollment?.campusId, 'campus-001');
  });

  await t.test('case-student-360-tabs', { todo: '接 students/[studentId] 页面顶部摘要、timeline 与 tab 独立请求' }, () => {});
  await t.test('case-cross-term-uniqueness', { todo: '补同一学生跨学期唯一主档与 enrollment 去重校验' }, () => {});
  await t.test('case-import-entry', { todo: '补 import 中心建档后 student360 可追溯断言' }, () => {});
});
