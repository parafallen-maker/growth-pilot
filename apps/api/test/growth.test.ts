import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { GrowthRepository } from '../src/modules/growth/repository/growth.repository';
import { ReportDraftJob } from '../src/modules/growth/job/report-draft.job';
import { ReportMaterialAssembler } from '../src/modules/growth/job/report-material-assembler';
import { GrowthService } from '../src/modules/growth/service/growth.service';
import { JobsRepository } from '../src/modules/jobs/repository/jobs.repository';
import { JobsService } from '../src/modules/jobs/service/jobs.service';

const dataDir = resolve(process.cwd(), '.data');

function resetDataDir() {
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
}

function createFixture() {
  const repository = new GrowthRepository();
  const jobsService = new JobsService(new JobsRepository());
  const assembler = new ReportMaterialAssembler(repository);
  const reportDraftJob = new ReportDraftJob(repository, assembler, jobsService);
  const service = new GrowthService(repository, reportDraftJob);
  return { repository, assembler, reportDraftJob, jobsService, service };
}

test('growth rubric / observation / goal / report workflows persist to disk', async () => {
  resetDataDir();
  const { service, jobsService } = createFixture();

  const rubrics = await service.listRubrics({ pageNo: 1, pageSize: 20, status: 'active' });
  assert.equal(rubrics.list.length, 1);
  assert.equal(rubrics.page.total, 1);

  const createdRubric = await service.createRubric({
    name: '课堂行为模板',
    status: 'active',
    dimensions: [
      { code: 'focus', name: '专注度' },
      { code: 'interaction', name: '互动性', scoreMin: 1, scoreMax: 5 },
    ],
  });
  assert.equal(createdRubric.dimensions.length, 2);

  const observation = await service.createObservation({
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

  const goal = await service.createGoal({
    studentId: 'student-001',
    goalType: 'habit',
    title: '上课先举手再发言',
    targetValue: 5,
    currentValue: 1,
    status: 'active',
  });
  const checkin = await service.createCheckin(goal.id, {
    checkinDate: '2026-03-24',
    progressValue: 2,
    progressNote: '提醒后能做到',
    nextAction: '课前先约定口令',
  });
  assert.equal(checkin.progressValue, 2);

  const job = await service.generateReportDraft({
    reportType: 'weekly',
    periodKey: '2026-W13',
    studentIds: ['student-001'],
    termId: 'term-2026-spring',
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(jobsService.getJob(job.jobId).status, 'success');

  const reportId = `report-student-001-2026-W13`;
  const reportDetail = await service.getReportDetail(reportId);
  assert.equal(reportDetail.report.status, 'draft');

  const reviewed = await service.reviewReport(reportId, {
    reviewerUserId: 'advisor-001',
    reviewNote: '结构可发布，补一段家长建议',
    title: '2026-W13 周报',
    draftMarkdown: '# 2026-W13 周报\n\n本周整体不错。',
  });
  assert.equal(reviewed.status, 'reviewed');

  const published = await service.publishReport(reportId, {
    publisherUserId: 'teacher-001',
    publishNote: '推送到家长群',
    channels: ['family_feed'],
  });
  assert.equal(published.status, 'published');

  const publishedObservations = await service.listObservations({ pageNo: 1, pageSize: 20, reportPublished: 'published' });
  assert.equal(publishedObservations.list.some((item) => item.id === observation.id), true);

  await assert.rejects(() => service.publishReport(reportId, { publisherUserId: 'teacher-001' }));

  const restartedRepository = new GrowthRepository();
  const reports = (await restartedRepository.listReports()).filter((item) => item.studentId === 'student-001');
  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.generatedByJobId, job.jobId);
  assert.equal(reports[0]?.status, 'published');
  assert.equal(reports[0]?.publishedAt != null, true);
  assert.equal((await restartedRepository.listRubrics()).length, 2);
  assert.equal((await restartedRepository.listObservations()).length, 2);
  assert.equal((await restartedRepository.findGoalById(goal.id))?.checkins.length, 1);
});
