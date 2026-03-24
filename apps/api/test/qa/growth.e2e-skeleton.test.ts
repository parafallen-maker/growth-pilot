import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';

test('E2E-04 成长管理闭环：rubric -> observation -> goal -> report draft skeleton', async (t) => {
  const { growthService } = createQaFixture();

  await t.test('smoke: create rubric/observation/goal/checkin and queue report draft', () => {
    const rubric = growthService.createRubric({
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      name: 'QA Rubric',
      stageScope: 'grade-1',
      status: 'active',
      description: '供 QA skeleton 使用',
      dimensions: [
        { code: 'focus', name: '专注度', weight: 1, scoreMin: 1, scoreMax: 5, sortOrder: 10 },
        { code: 'habit', name: '学习习惯', weight: 1, scoreMin: 1, scoreMax: 5, sortOrder: 20 },
      ],
    });

    const observation = growthService.createObservation({
      studentId: 'student-001',
      termId: 'term-2026-spring',
      teacherId: 'teacher-001',
      templateId: rubric.id,
      observationDate: '2026-03-25',
      scene: 'after_class_homework',
      strengths: '能主动订正',
      improvementNotes: '先独立完成再求助',
      publishToFamily: false,
      scores: rubric.dimensions.map((dimension, index) => ({
        dimensionId: dimension.id,
        score: index + 3,
        note: 'qa placeholder',
      })),
    });

    const goal = growthService.createGoal({
      studentId: 'student-001',
      termId: 'term-2026-spring',
      goalType: 'habit',
      title: '连续 5 天先独立思考 3 分钟',
      description: 'QA growth path',
      ownerRole: 'teacher',
      metricType: 'count',
      baselineValue: 1,
      targetValue: 5,
      currentValue: 1,
      startDate: '2026-03-25',
      dueDate: '2026-03-31',
      status: 'active',
    });

    const checkin = growthService.createCheckin(goal.id, {
      checkinDate: '2026-03-26',
      progressValue: 2,
      progressNote: '今天先自己列式',
      nextAction: '继续坚持',
    });

    const reportJob = growthService.generateReportDraft({
      reportType: 'weekly',
      periodKey: '2026-W13',
      studentIds: ['student-001'],
      termId: 'term-2026-spring',
    });

    const reports = growthService.listReports({ studentId: 'student-001', pageNo: 1, pageSize: 20 });
    assert.equal(observation.templateId, rubric.id);
    assert.equal(checkin.goalId, goal.id);
    assert.ok(reportJob.jobId.startsWith('job-growth-report-'));
    assert.equal(reports.list[0]?.status, 'draft');
  });

  await t.test('case-growth-pages-ui', { todo: '接 /growth/rubrics|observations|goals|reports 页面动作与状态块' }, () => {});
  await t.test('case-report-publish-separation', { todo: '补 draft 与 publish 分离、family 可见态与回滚断言' }, () => {});
  await t.test('case-material-traceability', { todo: '补报告素材池来源追溯与 observation/goal 链接校验' }, () => {});
});
