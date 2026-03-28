import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';
import { homeworkSmokeFixture } from './e2e-smoke.data';

test('QA-02 作业复核链：upload -> analyze -> review -> submit -> status executable', async (t) => {
  const { filesService, homeworkService, homeworkRepository, homeworkEventPublisher, jobsService } = createQaFixture();

  await t.test('smoke: file upload metadata + submission + analysis + review is executable', async () => {
    const uploaded = await filesService.uploadOne({
      fileName: 'qa-homework-math-01.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 128000,
      checksum: 'sha256:qa-homework-01',
      purpose: 'homework',
      sourceType: 'qa_e2e',
      uploadedBy: 'user-teacher-001',
    });

    const submission = await homeworkService.createSubmission({
      studentId: 'student-001',
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      teacherId: 'teacher-001',
      subject: 'math',
      homeworkDate: '2026-03-25',
      fileIds: [uploaded.fileId],
      remark: 'QA skeleton submission',
    });

    const analysisJob = await homeworkService.triggerAnalysis(submission.id, {
      provider: 'mock-provider',
      modelName: 'mock-vision-v1',
      promptVersion: 'homework-review-v3',
    }, 'qa-homework-analysis-001');
    const detailAfterAnalysis = await homeworkService.getSubmissionDetail(submission.id);
    const reviewResult = await homeworkService.submitReview(submission.id, {
      reviewerTeacherId: 'teacher-001',
      reviewResult: 'adjusted',
      finalAccuracyPct: 91,
      finalErrorSummary: '计算较稳，仍需二次审题。',
      finalSuggestion: '继续先圈关键词再验算。',
      publishToFamily: true,
      finalErrorItems: [{ errorTaxonomyId: 'taxonomy-001', weight: 2, note: 'placeholder taxonomy' }],
    });

    assert.ok(analysisJob.jobId.startsWith('job-'));
    assert.equal(detailAfterAnalysis.latestAiAnalysis?.status, 'success');
    assert.equal(reviewResult.reviewStatus, 'published');
    assert.equal((await homeworkRepository.getSubmissionOrThrow(submission.id)).reviewStatus, 'published');
    assert.equal((await homeworkEventPublisher.list())[0]?.eventName, 'HomeworkReviewed');
  });

  await t.test('case-analysis-job-center-record-is-queryable', async () => {
    const uploaded = await filesService.uploadOne({
      fileName: 'qa-homework-math-02.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 256000,
      checksum: 'sha256:qa-homework-02',
      purpose: 'homework',
      sourceType: 'qa_e2e',
      uploadedBy: 'user-teacher-001',
    });
    const submission = await homeworkService.createSubmission({
      studentId: 'student-001',
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      teacherId: 'teacher-001',
      subject: 'math',
      homeworkDate: '2026-03-26',
      fileIds: [uploaded.fileId],
    });

    const analysisJob = await homeworkService.triggerAnalysis(submission.id, {
      provider: 'mock-provider',
      modelName: 'mock-vision-v1',
      promptVersion: 'homework-review-v3',
    }, 'qa-homework-analysis-002');
    const jobDetail = jobsService.getJob(analysisJob.jobId);

    assert.equal(jobDetail.status, 'success');
    assert.equal(jobDetail.progress, 100);
    assert.equal(jobDetail.attempts, 1);
    assert.equal(jobDetail.result?.submissionId, submission.id);
  });

  await t.test('case-published-review-cannot-be-overwritten', async () => {
    const uploaded = await filesService.uploadOne({
      fileName: 'qa-homework-math-03.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 256000,
      checksum: 'sha256:qa-homework-03',
      purpose: 'homework',
      sourceType: 'qa_e2e',
      uploadedBy: 'user-teacher-001',
    });
    const submission = await homeworkService.createSubmission({
      studentId: 'student-001',
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      teacherId: 'teacher-001',
      subject: 'math',
      homeworkDate: '2026-03-27',
      fileIds: [uploaded.fileId],
    });

    await homeworkService.submitReview(submission.id, {
      reviewerTeacherId: 'teacher-001',
      reviewResult: 'approved',
      finalAccuracyPct: 95,
      publishToFamily: true,
    });

    await assert.rejects(() => homeworkService.submitReview(submission.id, {
      reviewerTeacherId: 'teacher-002',
      reviewResult: 'rejected',
      finalAccuracyPct: 60,
      publishToFamily: false,
    }), /published review can not be overwritten/i);
  });

  await t.test('case-review-workbench-ui', { todo: '接 /homework/review/[submissionId] 三栏工作台与 draft store' }, () => {});
  await t.test('case-analysis-dedupe-and-retry', { todo: '补重复触发 analyze 拦截、失败重试与 job center 断言' }, () => {});
  await t.test('case-error-taxonomy-maintenance', { todo: '补错因词典页启停/排序/引用关系校验' }, () => {});
});

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
