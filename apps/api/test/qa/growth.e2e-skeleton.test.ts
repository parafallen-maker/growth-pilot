import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';
import { growthSmokeFixture } from './e2e-smoke.data';

test('QA-03 成长目标链：rubric -> observation -> goal -> check-in -> report draft executable', async (t) => {
  const { growthService, jobsService } = createQaFixture();

  await t.test('smoke: create rubric/observation/goal/checkin and queue report draft', async () => {
    const rubric = await growthService.createRubric({
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

    const observation = await growthService.createObservation({
      studentId: 'student-001',
      termId: 'term-2026-spring',
      teacherId: 'teacher-001',
      templateId: rubric.id,
      observationDate: '2026-03-25',
      scene: 'after_class_homework',
      strengths: '能主动订正',
      improvementNotes: '先独立完成再求助',
      publishToFamily: false,
      scores: rubric.dimensions.map((dimension, index) => ({ dimensionId: dimension.id, score: index + 3, note: 'qa placeholder' })),
    });

    const goal = await growthService.createGoal({
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

    const checkin = await growthService.createCheckin(goal.id, {
      checkinDate: '2026-03-26',
      progressValue: 2,
      progressNote: '今天先自己列式',
      nextAction: '继续坚持',
    });

    const reportJob = await growthService.generateReportDraft({
      reportType: 'weekly',
      periodKey: '2026-W13',
      studentIds: ['student-001'],
      termId: 'term-2026-spring',
    });
    await new Promise((resolve) => setTimeout(resolve, 10));

    const reports = await growthService.listReports({ studentId: 'student-001', pageNo: 1, pageSize: 20 });
    assert.equal(observation.templateId, rubric.id);
    assert.equal(checkin.goalId, goal.id);
    assert.ok(reportJob.jobId.startsWith('job-growth_report_generate-'));
    assert.equal(reports.list[0]?.status, 'draft');
  });

  await t.test('case-report-job-result-and-material-traceability', async () => {
    const reportJob = await growthService.generateReportDraft({
      reportType: 'weekly',
      periodKey: '2026-W14',
      studentIds: ['student-001'],
      termId: 'term-2026-spring',
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const jobDetail = jobsService.getJob(reportJob.jobId);
    const report = (await growthService.listReports({ studentId: 'student-001', periodKey: '2026-W14', pageNo: 1, pageSize: 20 })).list[0];

    assert.equal(jobDetail.status, 'success');
    assert.equal(jobDetail.result?.reportCount, 1);
    assert.equal(report.generatedByJobId, reportJob.jobId);
    assert.ok(Array.isArray(report.summaryJson?.growthObservations));
    assert.ok(Array.isArray(report.summaryJson?.goals));
  });

  await t.test('case-observation-filters-invalid-dimensions-and-goal-progress-persists', async () => {
    const rubric = await growthService.createRubric({
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      name: 'QA Rubric Guard',
      stageScope: 'grade-1',
      dimensions: [{ code: 'focus', name: '专注度', weight: 1, scoreMin: 1, scoreMax: 5 }],
    });
    const observation = await growthService.createObservation({
      studentId: 'student-001',
      termId: 'term-2026-spring',
      teacherId: 'teacher-001',
      templateId: rubric.id,
      observationDate: '2026-03-27',
      scene: 'after_class_homework',
      strengths: '能坐住',
      improvementNotes: '继续减少分心',
      scores: [
        { dimensionId: rubric.dimensions[0].id, score: 4 },
        { dimensionId: 'dimension-invalid', score: 1 },
      ],
    });
    const goal = await growthService.createGoal({
      studentId: 'student-001',
      termId: 'term-2026-spring',
      goalType: 'habit',
      title: '连续专注 20 分钟',
      baselineValue: 1,
      targetValue: 5,
      currentValue: 1,
      startDate: '2026-03-27',
      dueDate: '2026-04-02',
      status: 'active',
    });

    await growthService.createCheckin(goal.id, {
      checkinDate: '2026-03-28',
      progressValue: 4,
      progressNote: '能自己做完前两题',
    });

    const filteredObservations = await growthService.listObservations({ studentId: 'student-001', pageNo: 1, pageSize: 20 });
    const updatedGoal = (await growthService.listGoals({ studentId: 'student-001', keyword: '连续专注', pageNo: 1, pageSize: 20 })).list[0];

    assert.equal(observation.scores.length, 1);
    assert.equal(filteredObservations.list[0]?.studentId, 'student-001');
    assert.equal(updatedGoal.currentValue, 4);
    assert.equal(updatedGoal.checkins[0]?.progressValue, 4);
  });
});

test('E2E-04 成长管理闭环：rubric -> observation -> goal -> report draft smoke', () => {
  const { growthService } = createQaFixture();

  const rubric = growthService.createRubric(growthSmokeFixture.rubric);
  assert.equal(growthService.listRubrics({ termId: growthSmokeFixture.rubric.termId, pageNo: 1, pageSize: 20 }).list[0]?.id, rubric.id);
  assert.equal(rubric.dimensions.length, 2);

  const observation = growthService.createObservation({
    ...growthSmokeFixture.observation,
    templateId: rubric.id,
    scores: [
      { dimensionId: rubric.dimensions[0]!.id, score: 4, note: '今天能保持专注' },
      { dimensionId: rubric.dimensions[1]!.id, score: 5, note: '能先独立订正' },
      { dimensionId: 'dimension-invalid', score: 1, note: '应被过滤' },
    ],
  });
  assert.equal(observation.templateId, rubric.id);
  assert.equal(observation.scores.length, 2);
  assert.equal(observation.totalScore, 10);

  const goal = growthService.createGoal(growthSmokeFixture.goal);
  const checkin = growthService.createCheckin(goal.id, growthSmokeFixture.checkin);
  assert.equal(checkin.goalId, goal.id);
  assert.equal(growthService.listGoals({ studentId: growthSmokeFixture.goal.studentId, pageNo: 1, pageSize: 20 }).list[0]?.checkins[0]?.id, checkin.id);

  const reportJob = growthService.generateReportDraft(growthSmokeFixture.report);
  const reports = growthService.listReports({ studentId: growthSmokeFixture.goal.studentId, pageNo: 1, pageSize: 20 });
  const report = reports.list[0];

  assert.ok(reportJob.jobId.startsWith('job-growth-report-'));
  assert.equal(report?.status, 'draft');
  assert.equal(report?.generatedByJobId, reportJob.jobId);
  assert.match(report?.draftMarkdown ?? '', /观察数：2/);
  assert.match(report?.draftMarkdown ?? '', /目标数：2/);
  assert.equal(report?.summaryJson.growthObservations[0]?.id, observation.id);
  assert.equal(report?.summaryJson.goals[0]?.id, goal.id);
  assert.equal(report?.summaryJson.goals[0]?.latestCheckin?.id, checkin.id);
});
