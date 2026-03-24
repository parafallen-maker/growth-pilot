import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  HomeworkAiAnalysis,
  HomeworkReview,
  HomeworkReviewErrorItem,
  HomeworkSubmission,
  HomeworkSubmissionFile,
} from '@growthpilot/schema/index';

export interface CreateHomeworkSubmissionRecord {
  studentId: string;
  campusId?: string;
  termId?: string;
  teacherId?: string;
  subject: string;
  homeworkDate: string;
  sourceType: string;
  sourceChannel: string;
  remark?: string;
  uploadedBy?: string | null;
}

export interface CreateHomeworkReviewRecord {
  submissionId: string;
  reviewerTeacherId?: string | null;
  reviewResult: 'approved' | 'adjusted' | 'rejected';
  finalAccuracyPct?: number | null;
  finalErrorSummary?: string | null;
  finalSuggestion?: string | null;
  publishToFamily: boolean;
  publishedAt?: string | null;
}

interface HomeworkState {
  submissions: HomeworkSubmission[];
  submissionFiles: HomeworkSubmissionFile[];
  analyses: HomeworkAiAnalysis[];
  reviews: HomeworkReview[];
  reviewErrorItems: HomeworkReviewErrorItem[];
}

@Injectable()
export class HomeworkRepository {
  private state: HomeworkState = {
    submissions: [
      {
        id: 'submission-001',
        submissionNo: 'HW202603230001',
        studentId: 'student-001',
        campusId: 'campus-001',
        termId: 'term-2026-spring',
        teacherId: 'teacher-001',
        subject: 'math',
        homeworkDate: '2026-03-23',
        sourceType: 'teacher_upload',
        sourceChannel: 'web',
        aiStatus: 'ready',
        reviewStatus: 'reviewed',
        finalAccuracyPct: 88,
        finalErrorSummary: '审题不够稳',
        familyFeedbackStatus: 'ready',
        remark: '样例作业',
        uploadedBy: 'user-teacher-001',
        uploadedAt: '2026-03-23T18:00:00+08:00',
        publishedAt: null,
        createdAt: '2026-03-23T18:00:00+08:00',
        updatedAt: '2026-03-23T18:30:00+08:00',
      },
    ],
    submissionFiles: [
      {
        id: 'submission-file-001',
        submissionId: 'submission-001',
        fileId: 'file-001',
        sortOrder: 100,
        createdAt: '2026-03-23T18:00:00+08:00',
      },
    ],
    analyses: [],
    reviews: [],
    reviewErrorItems: [],
  };

  listSubmissions() {
    return [...this.state.submissions];
  }

  findSubmissionById(submissionId: string) {
    return this.state.submissions.find((item) => item.id === submissionId);
  }

  getSubmissionOrThrow(submissionId: string) {
    const submission = this.findSubmissionById(submissionId);
    if (!submission) {
      throw new NotFoundException(`submission ${submissionId} not found`);
    }
    return submission;
  }

  createSubmission(input: CreateHomeworkSubmissionRecord) {
    const now = new Date().toISOString();
    const sequence = this.state.submissions.length + 1;
    const submission: HomeworkSubmission = {
      id: `submission-${String(sequence).padStart(3, '0')}`,
      submissionNo: `HW${input.homeworkDate.replaceAll('-', '')}${String(sequence).padStart(4, '0')}`,
      studentId: input.studentId,
      campusId: input.campusId,
      termId: input.termId,
      teacherId: input.teacherId,
      subject: input.subject,
      homeworkDate: input.homeworkDate,
      sourceType: input.sourceType,
      sourceChannel: input.sourceChannel,
      aiStatus: 'pending',
      reviewStatus: 'unreviewed',
      finalAccuracyPct: null,
      finalErrorSummary: null,
      familyFeedbackStatus: 'draft',
      remark: input.remark,
      uploadedBy: input.uploadedBy ?? null,
      uploadedAt: now,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.state.submissions.unshift(submission);
    return submission;
  }

  attachFiles(submissionId: string, fileIds: string[]) {
    const now = new Date().toISOString();
    const records = fileIds.map((fileId, index) => ({
      id: `submission-file-${String(this.state.submissionFiles.length + index + 1).padStart(3, '0')}`,
      submissionId,
      fileId,
      sortOrder: (index + 1) * 100,
      createdAt: now,
    } satisfies HomeworkSubmissionFile));

    this.state.submissionFiles.unshift(...records);
    return records;
  }

  listSubmissionFiles(submissionId: string) {
    return this.state.submissionFiles
      .filter((item) => item.submissionId === submissionId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  updateSubmission(submissionId: string, patch: Partial<HomeworkSubmission>) {
    const submission = this.getSubmissionOrThrow(submissionId);
    Object.assign(submission, patch, { updatedAt: new Date().toISOString() });
    return submission;
  }

  createAnalysis(record: Omit<HomeworkAiAnalysis, 'id' | 'createdAt'>) {
    const analysis: HomeworkAiAnalysis = {
      ...record,
      id: `analysis-${String(this.state.analyses.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    this.state.analyses.unshift(analysis);
    return analysis;
  }

  getLatestAnalysis(submissionId: string) {
    return this.state.analyses.find((item) => item.submissionId === submissionId);
  }

  getReviewBySubmissionId(submissionId: string) {
    return this.state.reviews.find((item) => item.submissionId === submissionId);
  }

  replaceReview(record: CreateHomeworkReviewRecord) {
    const now = new Date().toISOString();
    const existing = this.getReviewBySubmissionId(record.submissionId);
    if (existing) {
      Object.assign(existing, {
        reviewerTeacherId: record.reviewerTeacherId ?? null,
        reviewResult: record.reviewResult,
        finalAccuracyPct: record.finalAccuracyPct ?? null,
        finalErrorSummary: record.finalErrorSummary ?? null,
        finalSuggestion: record.finalSuggestion ?? null,
        publishToFamily: record.publishToFamily,
        publishedAt: record.publishedAt ?? null,
        reviewedAt: now,
        updatedAt: now,
      });
      return existing;
    }

    const review: HomeworkReview = {
      id: `review-${String(this.state.reviews.length + 1).padStart(3, '0')}`,
      submissionId: record.submissionId,
      reviewerTeacherId: record.reviewerTeacherId ?? null,
      reviewResult: record.reviewResult,
      finalAccuracyPct: record.finalAccuracyPct ?? null,
      finalErrorSummary: record.finalErrorSummary ?? null,
      finalSuggestion: record.finalSuggestion ?? null,
      publishToFamily: record.publishToFamily,
      publishedAt: record.publishedAt ?? null,
      reviewedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.state.reviews.unshift(review);
    return review;
  }

  replaceReviewErrorItems(reviewId: string, items: Array<{ errorTaxonomyId: string; weight: number; note?: string }>) {
    this.state.reviewErrorItems = this.state.reviewErrorItems.filter((item) => item.reviewId !== reviewId);
    const now = new Date().toISOString();
    const nextItems = items.map((item, index) => ({
      id: `review-error-${String(this.state.reviewErrorItems.length + index + 1).padStart(3, '0')}`,
      reviewId,
      errorTaxonomyId: item.errorTaxonomyId,
      weight: item.weight,
      note: item.note,
      createdAt: now,
    } satisfies HomeworkReviewErrorItem));
    this.state.reviewErrorItems.unshift(...nextItems);
    return nextItems;
  }

  listReviewErrorItems(reviewId: string) {
    return this.state.reviewErrorItems.filter((item) => item.reviewId === reviewId);
  }

  runInTransaction<T>(runner: () => T): T {
    const snapshot: HomeworkState = JSON.parse(JSON.stringify(this.state));
    try {
      return runner();
    } catch (error) {
      this.state = snapshot;
      throw error;
    }
  }
}
