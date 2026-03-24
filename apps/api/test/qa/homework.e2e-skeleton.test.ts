import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';
import { homeworkSmokeFixture } from './e2e-smoke.data';

test('E2E-03 作业闭环：upload -> submission -> analyze -> review smoke', async () => {
  const { filesService, homeworkService, homeworkRepository, homeworkEventPublisher, jobsService } = createQaFixture();

  const uploaded = await filesService.uploadOne(homeworkSmokeFixture.upload);
  const submission = homeworkService.createSubmission({
    ...homeworkSmokeFixture.submission,
    fileIds: [uploaded.fileId],
  });

  const beforeAnalysis = homeworkService.getSubmissionDetail(submission.id);
  assert.equal(beforeAnalysis.files.length, 1);
  assert.equal(beforeAnalysis.files[0]?.fileId, uploaded.fileId);
  assert.match(beforeAnalysis.submission.submissionNo, /^HW20260325\d{4}$/);
  assert.equal(beforeAnalysis.submission.aiStatus, 'pending');
  assert.equal(beforeAnalysis.submission.reviewStatus, 'unreviewed');

  const analysisJob = await homeworkService.triggerAnalysis(
    submission.id,
    homeworkSmokeFixture.analysis,
    homeworkSmokeFixture.analysis.idempotencyKey,
  );

  const detailAfterAnalysis = homeworkService.getSubmissionDetail(submission.id);
  assert.ok(analysisJob.jobId.startsWith('job-'));
  assert.equal(jobsService.getJob(analysisJob.jobId).status, 'success');
  assert.equal(detailAfterAnalysis.latestAiAnalysis?.status, 'success');
  assert.equal(detailAfterAnalysis.latestAiAnalysis?.provider, homeworkSmokeFixture.analysis.provider);
  assert.equal(detailAfterAnalysis.latestAiAnalysis?.structuredOutput?.accuracyPct, 86);
  assert.match(detailAfterAnalysis.latestAiAnalysis?.rawMarkdown ?? '', /imageCount: 1/);
  assert.equal(detailAfterAnalysis.submission.aiStatus, 'ready');

  const reviewResult = homeworkService.submitReview(submission.id, homeworkSmokeFixture.review);
  const detailAfterReview = homeworkService.getSubmissionDetail(submission.id);

  assert.equal(reviewResult.reviewStatus, 'published');
  assert.equal(detailAfterReview.submission.reviewStatus, 'published');
  assert.equal(detailAfterReview.submission.familyFeedbackStatus, 'published');
  assert.equal(detailAfterReview.submission.finalAccuracyPct, homeworkSmokeFixture.review.finalAccuracyPct);
  assert.equal(detailAfterReview.review?.reviewResult, homeworkSmokeFixture.review.reviewResult);
  assert.equal(
    homeworkRepository.listReviewErrorItems(detailAfterReview.review?.id ?? '').length,
    homeworkSmokeFixture.review.finalErrorItems.length,
  );
  assert.deepEqual(
    homeworkEventPublisher.list().map((event) => event.eventName).sort(),
    ['HomeworkReviewed', 'HomeworkSubmitted'],
  );

  assert.throws(
    () => homeworkService.submitReview(submission.id, homeworkSmokeFixture.review),
    /published review can not be overwritten/,
  );
});
