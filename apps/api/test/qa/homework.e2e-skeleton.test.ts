import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';

test('E2E-03 作业闭环：upload -> submission -> analyze -> review skeleton', async (t) => {
  const { filesService, homeworkService, homeworkRepository, homeworkEventPublisher } = createQaFixture();

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

    const submission = homeworkService.createSubmission({
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
    const detailAfterAnalysis = homeworkService.getSubmissionDetail(submission.id);
    const reviewResult = homeworkService.submitReview(submission.id, {
      reviewerTeacherId: 'teacher-001',
      reviewResult: 'adjusted',
      finalAccuracyPct: 91,
      finalErrorSummary: '计算较稳，仍需二次审题。',
      finalSuggestion: '继续先圈关键词再验算。',
      publishToFamily: true,
      finalErrorItems: [{ errorTaxonomyId: 'error-taxonomy-001', weight: 2, note: 'placeholder taxonomy' }],
    });

    assert.ok(analysisJob.jobId.startsWith('job-'));
    assert.equal(detailAfterAnalysis.latestAiAnalysis?.status, 'success');
    assert.equal(reviewResult.reviewStatus, 'published');
    assert.equal(homeworkRepository.getSubmissionOrThrow(submission.id).reviewStatus, 'published');
    assert.equal(homeworkEventPublisher.list()[0]?.eventName, 'HomeworkReviewed');
  });

  await t.test('case-review-workbench-ui', { todo: '接 /homework/review/[submissionId] 三栏工作台与 draft store' }, () => {});
  await t.test('case-analysis-dedupe-and-retry', { todo: '补重复触发 analyze 拦截、失败重试与 job center 断言' }, () => {});
  await t.test('case-error-taxonomy-maintenance', { todo: '补错因词典页启停/排序/引用关系校验' }, () => {});
});
