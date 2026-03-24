import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';
import { growthSmokeFixture } from './e2e-smoke.data';

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
