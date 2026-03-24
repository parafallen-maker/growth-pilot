import test from 'node:test';
import assert from 'node:assert/strict';
import { GrowthRepository } from '../src/modules/growth/repository/growth.repository';
import { ReportDraftJob } from '../src/modules/growth/job/report-draft.job';
import { ReportMaterialAssembler } from '../src/modules/growth/job/report-material-assembler';
import { GrowthService } from '../src/modules/growth/service/growth.service';

function createFixture() {
  const repository = new GrowthRepository();
  const assembler = new ReportMaterialAssembler(repository);
  const reportDraftJob = new ReportDraftJob(repository, assembler);
  const service = new GrowthService(repository, reportDraftJob);
  return { repository, assembler, reportDraftJob, service };
}

test('growth rubric / observation / goal / report skeleton flows work', () => {
  const { service } = createFixture();

  const rubrics = service.listRubrics({ pageNo: 1, pageSize: 20, status: 'active' });
  assert.equal(rubrics.list.length, 1);
  assert.equal(rubrics.page.total, 1);

  const createdRubric = service.createRubric({
    name: '课堂行为模板',
    status: 'active',
    dimensions: [
      { code: 'focus', name: '专注度' },
      { code: 'interaction', name: '互动性', scoreMin: 1, scoreMax: 5 },
    ],
  });
  assert.equal(createdRubric.dimensions.length, 2);

  const observation = service.createObservation({
    studentId: 'student-001',
    teacherId: 'teacher-001',
    templateId: createdRubric.id,
    observationDate: '2026-03-24',
    scene: 'classroom',
    scores: createdRubric.dimensions.map((item, index) => ({ dimensionId: item.id, score: index + 3 })),
    strengths: '能快速进入状态',
    improvementNotes: '回答前先完整复述题目',
    publishToFamily: true,
  });
  assert.equal(observation.totalScore, 7);

  const goal = service.createGoal({
    studentId: 'student-001',
    goalType: 'habit',
    title: '上课先举手再发言',
    targetValue: 5,
    currentValue: 1,
    status: 'active',
  });
  const checkin = service.createCheckin(goal.id, {
    checkinDate: '2026-03-24',
    progressValue: 2,
    progressNote: '提醒后能做到',
    nextAction: '课前先约定口令',
  });
  assert.equal(checkin.progressValue, 2);

  const job = service.generateReportDraft({
    reportType: 'weekly',
    periodKey: '2026-W13',
    studentIds: ['student-001'],
    termId: 'term-2026-spring',
  });
  assert.equal(job.status, 'queued');

  const reports = service.listReports({ pageNo: 1, pageSize: 20, studentId: 'student-001' });
  assert.equal(reports.page.total, 1);
  assert.equal(reports.list[0]?.generatedByJobId, job.jobId);
  assert.equal(reports.list[0]?.status, 'draft');
});
