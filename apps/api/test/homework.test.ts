import test from 'node:test';
import assert from 'node:assert/strict';
import { MockObjectStorageAdapter } from '../src/modules/files/adapter/mock-object-storage.adapter';
import { FileAssetRepository } from '../src/modules/files/repository/file-asset.repository';
import { FilesService } from '../src/modules/files/service/files.service';
import { JobsRepository } from '../src/modules/jobs/repository/jobs.repository';
import { JobsService } from '../src/modules/jobs/service/jobs.service';
import { MockHomeworkAnalysisAdapter } from '../src/modules/homework/adapter/mock-homework-analysis.adapter';
import { HomeworkEventPublisher } from '../src/modules/homework/event/homework-event.publisher';
import { HomeworkAnalysisQueue } from '../src/modules/homework/job/homework-analysis.queue';
import { HomeworkRepository } from '../src/modules/homework/repository/homework.repository';
import { HomeworkService } from '../src/modules/homework/service/homework.service';

function createHomeworkFixture() {
  const jobsService = new JobsService(new JobsRepository());
  const filesService = new FilesService(new FileAssetRepository(), new MockObjectStorageAdapter());
  const homeworkRepository = new HomeworkRepository();
  const eventPublisher = new HomeworkEventPublisher();
  const queue = new HomeworkAnalysisQueue(jobsService, homeworkRepository, filesService, new MockHomeworkAnalysisAdapter());
  const service = new HomeworkService(homeworkRepository, queue, eventPublisher, filesService);

  return {
    jobsService,
    homeworkRepository,
    eventPublisher,
    filesService,
    service,
  };
}

test('homework submission -> analyze -> review skeleton runs end-to-end', async () => {
  const { service, homeworkRepository, jobsService, eventPublisher } = createHomeworkFixture();

  const submission = service.createSubmission({
    studentId: 'student-001',
    campusId: 'campus-001',
    termId: 'term-2026-spring',
    teacherId: 'teacher-001',
    subject: 'math',
    homeworkDate: '2026-03-24',
    fileIds: ['file-001', 'file-002'],
    sourceType: 'teacher_upload',
    remark: '晚自习作业',
  });

  assert.equal(submission.aiStatus, 'pending');
  assert.equal(homeworkRepository.listSubmissionFiles(submission.id).length, 2);

  const job = await service.triggerAnalysis(submission.id, {
    provider: 'doubao',
    modelName: 'vision-v1',
    promptVersion: 'homework-review-v3',
  }, 'idem-homework-001');

  assert.match(job.jobId, /^job-homework_analysis-/);
  assert.equal(jobsService.getJob(job.jobId).status, 'success');
  assert.equal(homeworkRepository.getSubmissionOrThrow(submission.id).aiStatus, 'ready');
  assert.equal(homeworkRepository.getLatestAnalysis(submission.id)?.provider, 'doubao');

  const review = service.submitReview(submission.id, {
    reviewResult: 'adjusted',
    finalAccuracyPct: 85,
    finalErrorSummary: '概念混淆、审题偏差',
    finalSuggestion: '先圈关键词再作答',
    publishToFamily: true,
    finalErrorItems: [
      {
        errorTaxonomyId: 'taxonomy-001',
        weight: 2,
        note: '第二大题理解偏差',
      },
    ],
  });

  assert.equal(review.reviewStatus, 'published');
  const detail = service.getSubmissionDetail(submission.id);
  assert.equal(detail.submission.finalAccuracyPct, 85);
  assert.equal(detail.review?.publishToFamily, true);
  assert.equal(homeworkRepository.listReviewErrorItems(review.reviewId).length, 1);
  assert.deepEqual(
    eventPublisher.list().map((item) => item.eventName),
    ['HomeworkReviewed', 'HomeworkSubmitted'],
  );
});

test('homework analysis dedupe blocks duplicate active job', async () => {
  const { service } = createHomeworkFixture();

  await assert.rejects(
    service.triggerAnalysis('submission-001', {
      provider: 'doubao',
      modelName: 'vision-v1',
      promptVersion: 'homework-review-v3',
    }),
  );
});
