import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';

test('E2E-03 作业闭环：upload -> submission -> analyze -> review executable', async (t) => {
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
});
