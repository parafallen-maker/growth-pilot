import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import type {
  HomeworkAiAnalysis,
  HomeworkReview,
  HomeworkReviewErrorItem,
  HomeworkSubmission,
  HomeworkSubmissionFile,
} from '@growthpilot/schema/index';
import { createDb, dbSchema } from '../../../db';
import { PersistentJsonStore } from '../../../common/persistent-json.store';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';

export interface HomeworkReviewDraft {
  id: string;
  submissionId: string;
  reviewerTeacherId?: string | null;
  reviewResult?: 'approved' | 'adjusted' | 'rejected';
  finalAccuracyPct?: number | null;
  finalErrorSummary?: string | null;
  finalSuggestion?: string | null;
  publishToFamily: boolean;
  finalErrorItems: Array<{
    errorTaxonomyId: string;
    weight: number;
    note?: string;
  }>;
  savedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface HomeworkErrorTaxonomy {
  id: string;
  code: string;
  name: string;
  subject?: string;
  stageScope?: string;
  description?: string;
  status: 'draft' | 'active' | 'inactive';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface HomeworkOutboxEvent {
  id: string;
  eventName: 'HomeworkSubmitted' | 'HomeworkReviewed';
  bizId: string;
  payload: Record<string, unknown>;
  status: 'pending';
  createdAt: string;
}

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
  reviewDrafts: HomeworkReviewDraft[];
  errorTaxonomies: HomeworkErrorTaxonomy[];
  outboxEvents: HomeworkOutboxEvent[];
}

interface HomeworkRepositoryPort {
  listSubmissions(): Promise<HomeworkSubmission[]>;
  findSubmissionById(submissionId: string): Promise<HomeworkSubmission | undefined>;
  createSubmission(input: CreateHomeworkSubmissionRecord): Promise<HomeworkSubmission>;
  attachFiles(submissionId: string, fileIds: string[]): Promise<HomeworkSubmissionFile[]>;
  listSubmissionFiles(submissionId: string): Promise<HomeworkSubmissionFile[]>;
  updateSubmission(submissionId: string, patch: Partial<HomeworkSubmission>): Promise<HomeworkSubmission>;
  createAnalysis(record: Omit<HomeworkAiAnalysis, 'id' | 'createdAt'>): Promise<HomeworkAiAnalysis>;
  getLatestAnalysis(submissionId: string): Promise<HomeworkAiAnalysis | undefined>;
  getReviewBySubmissionId(submissionId: string): Promise<HomeworkReview | undefined>;
  replaceReview(record: CreateHomeworkReviewRecord): Promise<HomeworkReview>;
  replaceReviewErrorItems(reviewId: string, items: Array<{ errorTaxonomyId: string; weight: number; note?: string }>): Promise<HomeworkReviewErrorItem[]>;
  listReviewErrorItems(reviewId: string): Promise<HomeworkReviewErrorItem[]>;
  getReviewDraft(submissionId: string): Promise<HomeworkReviewDraft | null>;
  saveReviewDraft(submissionId: string, payload: {
    reviewerTeacherId?: string | null;
    reviewResult?: 'approved' | 'adjusted' | 'rejected';
    finalAccuracyPct?: number | null;
    finalErrorSummary?: string | null;
    finalSuggestion?: string | null;
    publishToFamily?: boolean;
    finalErrorItems?: Array<{ errorTaxonomyId: string; weight?: number; note?: string }>;
  }): Promise<HomeworkReviewDraft>;
  deleteReviewDraft(submissionId: string): Promise<void>;
  listErrorTaxonomies(): Promise<HomeworkErrorTaxonomy[]>;
  createErrorTaxonomy(input: Omit<HomeworkErrorTaxonomy, 'id' | 'createdAt' | 'updatedAt'>): Promise<HomeworkErrorTaxonomy>;
  updateErrorTaxonomy(taxonomyId: string, patch: Partial<Omit<HomeworkErrorTaxonomy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<HomeworkErrorTaxonomy>;
  deleteErrorTaxonomy(taxonomyId: string): Promise<void>;
  enqueueOutboxEvent(eventName: HomeworkOutboxEvent['eventName'], bizId: string, payload: Record<string, unknown>): Promise<HomeworkOutboxEvent>;
  listOutboxEvents(): Promise<HomeworkOutboxEvent[]>;
  runInTransaction<T>(runner: () => Promise<T> | T): Promise<T>;
}

const createInitialState = (): HomeworkState => ({
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
  reviewDrafts: [],
  errorTaxonomies: [
    {
      id: 'taxonomy-001',
      code: 'MATH_CALC',
      name: '计算错误',
      subject: 'math',
      stageScope: 'grade-1',
      description: '口算、竖式、抄写导致的计算失误',
      status: 'active',
      sortOrder: 100,
      createdAt: '2026-03-23T18:00:00+08:00',
      updatedAt: '2026-03-23T18:00:00+08:00',
    },
  ],
  outboxEvents: [],
});

class FileHomeworkRepository implements HomeworkRepositoryPort {
  private readonly store: PersistentJsonStore<HomeworkState>;

  constructor(filePath = '.data/homework.json') {
    this.store = new PersistentJsonStore<HomeworkState>(filePath, createInitialState);
  }

  async listSubmissions() { return [...this.store.get().submissions]; }
  async findSubmissionById(submissionId: string) { return this.store.get().submissions.find((item) => item.id === submissionId); }

  async createSubmission(input: CreateHomeworkSubmissionRecord) {
    const now = new Date().toISOString();
    const sequence = this.store.get().submissions.length + 1;
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

    this.store.update((state) => {
      state.submissions.unshift(submission);
    });
    return submission;
  }

  async attachFiles(submissionId: string, fileIds: string[]) {
    const now = new Date().toISOString();
    const currentSize = this.store.get().submissionFiles.length;
    const records = fileIds.map((fileId, index) => ({
      id: `submission-file-${String(currentSize + index + 1).padStart(3, '0')}`,
      submissionId,
      fileId,
      sortOrder: (index + 1) * 100,
      createdAt: now,
    } satisfies HomeworkSubmissionFile));

    this.store.update((state) => {
      state.submissionFiles.unshift(...records);
    });
    return records;
  }

  async listSubmissionFiles(submissionId: string) {
    return this.store.get().submissionFiles.filter((item) => item.submissionId === submissionId).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async updateSubmission(submissionId: string, patch: Partial<HomeworkSubmission>) {
    let updated: HomeworkSubmission | undefined;
    this.store.update((state) => {
      const submission = state.submissions.find((item) => item.id === submissionId);
      if (!submission) {
        throw new NotFoundException(`submission ${submissionId} not found`);
      }
      Object.assign(submission, patch, { updatedAt: new Date().toISOString() });
      updated = submission;
    });
    return updated!;
  }

  async createAnalysis(record: Omit<HomeworkAiAnalysis, 'id' | 'createdAt'>) {
    const analysis: HomeworkAiAnalysis = {
      ...record,
      id: `analysis-${String(this.store.get().analyses.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    this.store.update((state) => {
      state.analyses.unshift(analysis);
    });
    return analysis;
  }

  async getLatestAnalysis(submissionId: string) {
    return this.store.get().analyses.find((item) => item.submissionId === submissionId);
  }

  async getReviewBySubmissionId(submissionId: string) {
    return this.store.get().reviews.find((item) => item.submissionId === submissionId);
  }

  async replaceReview(record: CreateHomeworkReviewRecord) {
    const now = new Date().toISOString();
    const existing = await this.getReviewBySubmissionId(record.submissionId);
    if (existing) {
      this.store.update((state) => {
        const target = state.reviews.find((item) => item.id === existing.id)!;
        Object.assign(target, {
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
      });
      return (await this.getReviewBySubmissionId(record.submissionId))!;
    }

    const review: HomeworkReview = {
      id: `review-${String(this.store.get().reviews.length + 1).padStart(3, '0')}`,
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

    this.store.update((state) => {
      state.reviews.unshift(review);
    });
    return review;
  }

  async replaceReviewErrorItems(reviewId: string, items: Array<{ errorTaxonomyId: string; weight: number; note?: string }>) {
    const now = new Date().toISOString();
    let nextItems: HomeworkReviewErrorItem[] = [];
    this.store.update((state) => {
      state.reviewErrorItems = state.reviewErrorItems.filter((item) => item.reviewId !== reviewId);
      nextItems = items.map((item, index) => ({
        id: `review-error-${String(state.reviewErrorItems.length + index + 1).padStart(3, '0')}`,
        reviewId,
        errorTaxonomyId: item.errorTaxonomyId,
        weight: item.weight,
        note: item.note,
        createdAt: now,
      } satisfies HomeworkReviewErrorItem));
      state.reviewErrorItems.unshift(...nextItems);
    });
    return nextItems;
  }

  async listReviewErrorItems(reviewId: string) {
    return this.store.get().reviewErrorItems.filter((item) => item.reviewId === reviewId);
  }

  async getReviewDraft(submissionId: string) {
    return this.store.get().reviewDrafts.find((item) => item.submissionId === submissionId) ?? null;
  }

  async saveReviewDraft(submissionId: string, payload: {
    reviewerTeacherId?: string | null;
    reviewResult?: 'approved' | 'adjusted' | 'rejected';
    finalAccuracyPct?: number | null;
    finalErrorSummary?: string | null;
    finalSuggestion?: string | null;
    publishToFamily?: boolean;
    finalErrorItems?: Array<{ errorTaxonomyId: string; weight?: number; note?: string }>;
  }) {
    await this.requireSubmission(submissionId);
    const now = new Date().toISOString();
    const existing = await this.getReviewDraft(submissionId);
    if (existing) {
      this.store.update((state) => {
        const target = state.reviewDrafts.find((item) => item.id === existing.id)!;
        Object.assign(target, {
          reviewerTeacherId: payload.reviewerTeacherId ?? null,
          reviewResult: payload.reviewResult,
          finalAccuracyPct: payload.finalAccuracyPct ?? null,
          finalErrorSummary: payload.finalErrorSummary ?? null,
          finalSuggestion: payload.finalSuggestion ?? null,
          publishToFamily: payload.publishToFamily ?? false,
          finalErrorItems: (payload.finalErrorItems ?? []).map((item) => ({
            errorTaxonomyId: item.errorTaxonomyId,
            weight: item.weight ?? 1,
            note: item.note,
          })),
          savedAt: now,
          updatedAt: now,
        });
      });
      return (await this.getReviewDraft(submissionId))!;
    }

    const draft: HomeworkReviewDraft = {
      id: `review-draft-${String(this.store.get().reviewDrafts.length + 1).padStart(3, '0')}`,
      submissionId,
      reviewerTeacherId: payload.reviewerTeacherId ?? null,
      reviewResult: payload.reviewResult,
      finalAccuracyPct: payload.finalAccuracyPct ?? null,
      finalErrorSummary: payload.finalErrorSummary ?? null,
      finalSuggestion: payload.finalSuggestion ?? null,
      publishToFamily: payload.publishToFamily ?? false,
      finalErrorItems: (payload.finalErrorItems ?? []).map((item) => ({ errorTaxonomyId: item.errorTaxonomyId, weight: item.weight ?? 1, note: item.note })),
      savedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.store.update((state) => {
      state.reviewDrafts.unshift(draft);
    });
    return draft;
  }

  async deleteReviewDraft(submissionId: string) {
    this.store.update((state) => {
      state.reviewDrafts = state.reviewDrafts.filter((item) => item.submissionId !== submissionId);
    });
  }

  async listErrorTaxonomies() {
    return [...this.store.get().errorTaxonomies].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
  }

  async createErrorTaxonomy(input: Omit<HomeworkErrorTaxonomy, 'id' | 'createdAt' | 'updatedAt'>) {
    const exists = this.store.get().errorTaxonomies.some((item) => item.code === input.code);
    if (exists) {
      throw new ConflictException(`error taxonomy code ${input.code} already exists`);
    }
    const now = new Date().toISOString();
    const taxonomy: HomeworkErrorTaxonomy = {
      id: `taxonomy-${String(this.store.get().errorTaxonomies.length + 1).padStart(3, '0')}`,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.store.update((state) => {
      state.errorTaxonomies.unshift(taxonomy);
    });
    return taxonomy;
  }

  async updateErrorTaxonomy(taxonomyId: string, patch: Partial<Omit<HomeworkErrorTaxonomy, 'id' | 'createdAt' | 'updatedAt'>>) {
    let updated: HomeworkErrorTaxonomy | undefined;
    this.store.update((state) => {
      const target = state.errorTaxonomies.find((item) => item.id === taxonomyId);
      if (!target) {
        throw new NotFoundException(`error taxonomy ${taxonomyId} not found`);
      }
      if (patch.code && patch.code !== target.code) {
        const duplicated = state.errorTaxonomies.some((item) => item.id !== taxonomyId && item.code === patch.code);
        if (duplicated) {
          throw new ConflictException(`error taxonomy code ${patch.code} already exists`);
        }
      }
      Object.assign(target, patch, { updatedAt: new Date().toISOString() });
      updated = target;
    });
    return updated!;
  }

  async deleteErrorTaxonomy(taxonomyId: string) {
    const taxonomy = this.store.get().errorTaxonomies.find((item) => item.id === taxonomyId);
    if (!taxonomy) {
      throw new NotFoundException(`error taxonomy ${taxonomyId} not found`);
    }
    const referenced = this.store.get().reviewErrorItems.some((item) => item.errorTaxonomyId === taxonomyId);
    if (referenced) {
      throw new ConflictException(`error taxonomy ${taxonomyId} is referenced by review items`);
    }
    this.store.update((state) => {
      state.errorTaxonomies = state.errorTaxonomies.filter((item) => item.id !== taxonomyId);
    });
  }

  async enqueueOutboxEvent(eventName: HomeworkOutboxEvent['eventName'], bizId: string, payload: Record<string, unknown>) {
    const event: HomeworkOutboxEvent = {
      id: `homework-outbox-${String(this.store.get().outboxEvents.length + 1).padStart(3, '0')}`,
      eventName,
      bizId,
      payload,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.store.update((state) => {
      state.outboxEvents.unshift(event);
    });
    return event;
  }

  async listOutboxEvents() { return [...this.store.get().outboxEvents]; }

  async runInTransaction<T>(runner: () => Promise<T> | T): Promise<T> {
    const snapshot = this.store.snapshot();
    try {
      return await runner();
    } catch (error) {
      this.store.replace(snapshot);
      throw error;
    }
  }

  private async requireSubmission(submissionId: string) {
    const submission = await this.findSubmissionById(submissionId);
    if (!submission) throw new NotFoundException(`submission ${submissionId} not found`);
    return submission;
  }
}

class DbHomeworkRepository implements HomeworkRepositoryPort {
  private readonly db = createDb();

  async listSubmissions() {
    const rows = await this.db.select().from(dbSchema.homeworkSubmissions).orderBy(asc(dbSchema.homeworkSubmissions.createdAt));
    return rows.map((row) => this.mapSubmission(row));
  }

  async findSubmissionById(submissionId: string) {
    const rows = await this.db.select().from(dbSchema.homeworkSubmissions).where(eq(dbSchema.homeworkSubmissions.id, submissionId)).limit(1);
    return rows[0] ? this.mapSubmission(rows[0]) : undefined;
  }

  async createSubmission(input: CreateHomeworkSubmissionRecord) {
    const now = new Date();
    const sequence = (await this.listSubmissions()).length + 1;
    const [created] = await this.db.insert(dbSchema.homeworkSubmissions).values({
      submissionNo: `HW${input.homeworkDate.replaceAll('-', '')}${String(sequence).padStart(4, '0')}`,
      studentId: input.studentId,
      campusId: input.campusId ?? null,
      termId: input.termId ?? null,
      teacherId: input.teacherId ?? null,
      subject: input.subject,
      homeworkDate: input.homeworkDate,
      sourceType: input.sourceType,
      sourceChannel: input.sourceChannel,
      aiStatus: 'pending',
      reviewStatus: 'unreviewed',
      finalAccuracyPct: null,
      finalErrorSummary: null,
      familyFeedbackStatus: 'draft',
      remark: input.remark ?? null,
      uploadedBy: input.uploadedBy ?? null,
      uploadedAt: now,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.mapSubmission(created);
  }

  async attachFiles(submissionId: string, fileIds: string[]) {
    if (!fileIds.length) return [];
    const now = new Date();
    const rows = await this.db.insert(dbSchema.homeworkSubmissionFiles).values(
      fileIds.map((fileId, index) => ({ submissionId, fileId, sortOrder: (index + 1) * 100, createdAt: now })),
    ).returning();
    return rows.map((row) => this.mapSubmissionFile(row));
  }

  async listSubmissionFiles(submissionId: string) {
    const rows = await this.db.select().from(dbSchema.homeworkSubmissionFiles).where(eq(dbSchema.homeworkSubmissionFiles.submissionId, submissionId)).orderBy(asc(dbSchema.homeworkSubmissionFiles.sortOrder));
    return rows.map((row) => this.mapSubmissionFile(row));
  }

  async updateSubmission(submissionId: string, patch: Partial<HomeworkSubmission>) {
    const [updated] = await this.db.update(dbSchema.homeworkSubmissions).set({
      campusId: patch.campusId,
      termId: patch.termId,
      teacherId: patch.teacherId,
      subject: patch.subject,
      homeworkDate: patch.homeworkDate,
      sourceType: patch.sourceType,
      sourceChannel: patch.sourceChannel,
      aiStatus: patch.aiStatus,
      reviewStatus: patch.reviewStatus,
      finalAccuracyPct: patch.finalAccuracyPct?.toString() ?? (patch.finalAccuracyPct === null ? null : undefined),
      finalErrorSummary: patch.finalErrorSummary,
      familyFeedbackStatus: patch.familyFeedbackStatus,
      remark: patch.remark,
      uploadedBy: patch.uploadedBy,
      uploadedAt: patch.uploadedAt ? new Date(patch.uploadedAt) : undefined,
      publishedAt: patch.publishedAt ? new Date(patch.publishedAt) : patch.publishedAt === null ? null : undefined,
      updatedAt: new Date(),
    }).where(eq(dbSchema.homeworkSubmissions.id, submissionId)).returning();
    if (!updated) throw new NotFoundException(`submission ${submissionId} not found`);
    return this.mapSubmission(updated);
  }

  async createAnalysis(record: Omit<HomeworkAiAnalysis, 'id' | 'createdAt'>) {
    const [created] = await this.db.insert(dbSchema.homeworkAiAnalyses).values({
      submissionId: record.submissionId,
      jobId: record.jobId ?? null,
      provider: record.provider,
      modelName: record.modelName,
      modelVersion: record.modelVersion ?? null,
      promptVersion: record.promptVersion ?? null,
      status: record.status,
      rawMarkdown: record.rawMarkdown ?? null,
      structuredOutput: record.structuredOutput ?? {},
      accuracyPct: record.accuracyPct?.toString() ?? null,
      errorSummaryText: record.errorSummaryText ?? null,
      suggestionText: record.suggestionText ?? null,
      confidence: record.confidence?.toString() ?? null,
      durationMs: record.durationMs ?? null,
      inputTokens: record.inputTokens ?? null,
      outputTokens: record.outputTokens ?? null,
      errorMessage: record.errorMessage ?? null,
      createdAt: new Date(),
    }).returning();
    return this.mapAnalysis(created);
  }

  async getLatestAnalysis(submissionId: string) {
    const rows = await this.db.select().from(dbSchema.homeworkAiAnalyses).where(eq(dbSchema.homeworkAiAnalyses.submissionId, submissionId)).orderBy(asc(dbSchema.homeworkAiAnalyses.createdAt));
    return rows.length ? this.mapAnalysis(rows[rows.length - 1]!) : undefined;
  }

  async getReviewBySubmissionId(submissionId: string) {
    const rows = await this.db.select().from(dbSchema.homeworkReviews).where(eq(dbSchema.homeworkReviews.submissionId, submissionId)).limit(1);
    return rows[0] ? this.mapReview(rows[0]) : undefined;
  }

  async replaceReview(record: CreateHomeworkReviewRecord) {
    const now = new Date();
    const existing = await this.getReviewBySubmissionId(record.submissionId);
    if (existing) {
      const [updated] = await this.db.update(dbSchema.homeworkReviews).set({
        reviewerTeacherId: record.reviewerTeacherId ?? null,
        reviewResult: record.reviewResult,
        finalAccuracyPct: record.finalAccuracyPct?.toString() ?? null,
        finalErrorSummary: record.finalErrorSummary ?? null,
        finalSuggestion: record.finalSuggestion ?? null,
        publishToFamily: this.boolString(record.publishToFamily),
        publishedAt: record.publishedAt ? new Date(record.publishedAt) : null,
        reviewedAt: now,
        updatedAt: now,
      }).where(eq(dbSchema.homeworkReviews.id, existing.id)).returning();
      return this.mapReview(updated!);
    }
    const [created] = await this.db.insert(dbSchema.homeworkReviews).values({
      submissionId: record.submissionId,
      reviewerTeacherId: record.reviewerTeacherId ?? null,
      reviewResult: record.reviewResult,
      finalAccuracyPct: record.finalAccuracyPct?.toString() ?? null,
      finalErrorSummary: record.finalErrorSummary ?? null,
      finalSuggestion: record.finalSuggestion ?? null,
      publishToFamily: this.boolString(record.publishToFamily),
      publishedAt: record.publishedAt ? new Date(record.publishedAt) : null,
      reviewedAt: now,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.mapReview(created);
  }

  async replaceReviewErrorItems(reviewId: string, items: Array<{ errorTaxonomyId: string; weight: number; note?: string }>) {
    await this.db.delete(dbSchema.homeworkReviewTags).where(eq(dbSchema.homeworkReviewTags.reviewId, reviewId));
    if (!items.length) return [];
    const rows = await this.db.insert(dbSchema.homeworkReviewTags).values(
      items.map((item) => ({ reviewId, errorTaxonomyId: item.errorTaxonomyId, weight: item.weight.toString(), note: item.note ?? null, createdAt: new Date() })),
    ).returning();
    return rows.map((row) => this.mapReviewErrorItem(row));
  }

  async listReviewErrorItems(reviewId: string) {
    const rows = await this.db.select().from(dbSchema.homeworkReviewTags).where(eq(dbSchema.homeworkReviewTags.reviewId, reviewId));
    return rows.map((row) => this.mapReviewErrorItem(row));
  }

  async getReviewDraft(submissionId: string) {
    const review = await this.getReviewBySubmissionId(submissionId);
    if (!review) return null;
    const items = await this.listReviewErrorItems(review.id);
    return {
      id: `derived-${review.id}`,
      submissionId,
      reviewerTeacherId: review.reviewerTeacherId ?? null,
      reviewResult: review.reviewResult,
      finalAccuracyPct: review.finalAccuracyPct ?? null,
      finalErrorSummary: review.finalErrorSummary ?? null,
      finalSuggestion: review.finalSuggestion ?? null,
      publishToFamily: review.publishToFamily,
      finalErrorItems: items.map((item) => ({ errorTaxonomyId: item.errorTaxonomyId, weight: item.weight, note: item.note })),
      savedAt: review.updatedAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  async saveReviewDraft(submissionId: string, payload: {
    reviewerTeacherId?: string | null;
    reviewResult?: 'approved' | 'adjusted' | 'rejected';
    finalAccuracyPct?: number | null;
    finalErrorSummary?: string | null;
    finalSuggestion?: string | null;
    publishToFamily?: boolean;
    finalErrorItems?: Array<{ errorTaxonomyId: string; weight?: number; note?: string }>;
  }) {
    const submission = await this.requireSubmission(submissionId);
    const review = await this.replaceReview({
      submissionId,
      reviewerTeacherId: payload.reviewerTeacherId ?? submission.teacherId ?? null,
      reviewResult: payload.reviewResult ?? 'adjusted',
      finalAccuracyPct: payload.finalAccuracyPct ?? null,
      finalErrorSummary: payload.finalErrorSummary ?? null,
      finalSuggestion: payload.finalSuggestion ?? null,
      publishToFamily: payload.publishToFamily ?? false,
      publishedAt: null,
    });
    await this.replaceReviewErrorItems(review.id, (payload.finalErrorItems ?? []).map((item) => ({ errorTaxonomyId: item.errorTaxonomyId, weight: item.weight ?? 1, note: item.note })));
    return (await this.getReviewDraft(submissionId))!;
  }

  async deleteReviewDraft(_submissionId: string) {
    // DB mode currently stores review draft in review/review_items tables; keep latest saved draft until final review overwrites it.
  }

  async listErrorTaxonomies() {
    const rows = await this.db.select().from(dbSchema.errorTaxonomies).orderBy(asc(dbSchema.errorTaxonomies.sortOrder));
    return rows.map((row) => this.mapTaxonomy(row));
  }

  async createErrorTaxonomy(input: Omit<HomeworkErrorTaxonomy, 'id' | 'createdAt' | 'updatedAt'>) {
    const duplicate = await this.db.select({ id: dbSchema.errorTaxonomies.id }).from(dbSchema.errorTaxonomies).where(eq(dbSchema.errorTaxonomies.code, input.code)).limit(1);
    if (duplicate[0]) throw new ConflictException(`error taxonomy code ${input.code} already exists`);
    const [created] = await this.db.insert(dbSchema.errorTaxonomies).values({
      code: input.code,
      name: input.name,
      category: input.stageScope ?? input.subject ?? 'general',
      subjectScope: input.subject ?? null,
      description: input.description ?? null,
      active: input.status === 'active' ? 'true' : 'false',
      sortOrder: input.sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return this.mapTaxonomy(created, input.stageScope);
  }

  async updateErrorTaxonomy(taxonomyId: string, patch: Partial<Omit<HomeworkErrorTaxonomy, 'id' | 'createdAt' | 'updatedAt'>>) {
    const current = (await this.db.select().from(dbSchema.errorTaxonomies).where(eq(dbSchema.errorTaxonomies.id, taxonomyId)).limit(1))[0];
    if (!current) throw new NotFoundException(`error taxonomy ${taxonomyId} not found`);
    if (patch.code && patch.code !== current.code) {
      const duplicate = await this.db.select({ id: dbSchema.errorTaxonomies.id }).from(dbSchema.errorTaxonomies).where(eq(dbSchema.errorTaxonomies.code, patch.code)).limit(1);
      if (duplicate[0]) throw new ConflictException(`error taxonomy code ${patch.code} already exists`);
    }
    const [updated] = await this.db.update(dbSchema.errorTaxonomies).set({
      code: patch.code,
      name: patch.name,
      category: patch.stageScope ?? current.category,
      subjectScope: patch.subject,
      description: patch.description,
      active: patch.status ? (patch.status === 'active' ? 'true' : 'false') : undefined,
      sortOrder: patch.sortOrder,
      updatedAt: new Date(),
    }).where(eq(dbSchema.errorTaxonomies.id, taxonomyId)).returning();
    return this.mapTaxonomy(updated, patch.stageScope);
  }

  async deleteErrorTaxonomy(taxonomyId: string) {
    const referenced = await this.db.select({ id: dbSchema.homeworkReviewTags.id }).from(dbSchema.homeworkReviewTags).where(eq(dbSchema.homeworkReviewTags.errorTaxonomyId, taxonomyId)).limit(1);
    if (referenced[0]) throw new ConflictException(`error taxonomy ${taxonomyId} is referenced by review items`);
    const rows = await this.db.delete(dbSchema.errorTaxonomies).where(eq(dbSchema.errorTaxonomies.id, taxonomyId)).returning({ id: dbSchema.errorTaxonomies.id });
    if (!rows[0]) throw new NotFoundException(`error taxonomy ${taxonomyId} not found`);
  }

  async enqueueOutboxEvent(eventName: HomeworkOutboxEvent['eventName'], bizId: string, payload: Record<string, unknown>) {
    return {
      id: `homework-outbox-${Date.now()}`,
      eventName,
      bizId,
      payload,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };
  }

  async listOutboxEvents() { return []; }

  async runInTransaction<T>(runner: () => Promise<T> | T): Promise<T> {
    return this.db.transaction(async () => runner());
  }

  private async requireSubmission(submissionId: string) {
    const submission = await this.findSubmissionById(submissionId);
    if (!submission) throw new NotFoundException(`submission ${submissionId} not found`);
    return submission;
  }

  private mapSubmission(row: typeof dbSchema.homeworkSubmissions.$inferSelect): HomeworkSubmission {
    return {
      id: row.id,
      submissionNo: row.submissionNo,
      studentId: row.studentId,
      campusId: row.campusId ?? undefined,
      termId: row.termId ?? undefined,
      teacherId: row.teacherId ?? undefined,
      subject: row.subject,
      homeworkDate: row.homeworkDate,
      sourceType: row.sourceType,
      sourceChannel: row.sourceChannel,
      aiStatus: row.aiStatus as HomeworkSubmission['aiStatus'],
      reviewStatus: row.reviewStatus as HomeworkSubmission['reviewStatus'],
      finalAccuracyPct: this.toNumber(row.finalAccuracyPct),
      finalErrorSummary: row.finalErrorSummary ?? null,
      familyFeedbackStatus: row.familyFeedbackStatus as HomeworkSubmission['familyFeedbackStatus'],
      remark: row.remark ?? undefined,
      uploadedBy: row.uploadedBy ?? null,
      uploadedAt: row.uploadedAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapSubmissionFile(row: typeof dbSchema.homeworkSubmissionFiles.$inferSelect): HomeworkSubmissionFile {
    return { id: row.id, submissionId: row.submissionId, fileId: row.fileId, sortOrder: row.sortOrder, createdAt: row.createdAt.toISOString() };
  }

  private mapAnalysis(row: typeof dbSchema.homeworkAiAnalyses.$inferSelect): HomeworkAiAnalysis {
    return {
      id: row.id,
      submissionId: row.submissionId,
      jobId: row.jobId ?? null,
      provider: row.provider,
      modelName: row.modelName,
      modelVersion: row.modelVersion ?? undefined,
      promptVersion: row.promptVersion ?? undefined,
      status: row.status as HomeworkAiAnalysis['status'],
      rawMarkdown: row.rawMarkdown ?? undefined,
      structuredOutput: (row.structuredOutput ?? {}) as HomeworkAiAnalysis['structuredOutput'],
      accuracyPct: this.toNumber(row.accuracyPct),
      errorSummaryText: row.errorSummaryText ?? null,
      suggestionText: row.suggestionText ?? null,
      confidence: this.toNumber(row.confidence),
      durationMs: row.durationMs ?? null,
      inputTokens: row.inputTokens ?? null,
      outputTokens: row.outputTokens ?? null,
      errorMessage: row.errorMessage ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapReview(row: typeof dbSchema.homeworkReviews.$inferSelect): HomeworkReview {
    return {
      id: row.id,
      submissionId: row.submissionId,
      reviewerTeacherId: row.reviewerTeacherId ?? null,
      reviewResult: row.reviewResult as HomeworkReview['reviewResult'],
      finalAccuracyPct: this.toNumber(row.finalAccuracyPct),
      finalErrorSummary: row.finalErrorSummary ?? null,
      finalSuggestion: row.finalSuggestion ?? null,
      publishToFamily: row.publishToFamily === 'true',
      publishedAt: row.publishedAt?.toISOString() ?? null,
      reviewedAt: row.reviewedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapReviewErrorItem(row: typeof dbSchema.homeworkReviewTags.$inferSelect): HomeworkReviewErrorItem {
    return { id: row.id, reviewId: row.reviewId, errorTaxonomyId: row.errorTaxonomyId, weight: this.toNumber(row.weight) ?? 0, note: row.note ?? undefined, createdAt: row.createdAt.toISOString() };
  }

  private mapTaxonomy(row: typeof dbSchema.errorTaxonomies.$inferSelect, stageScope?: string): HomeworkErrorTaxonomy {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      subject: row.subjectScope ?? undefined,
      stageScope: stageScope ?? (row.category !== 'general' ? row.category : undefined),
      description: row.description ?? undefined,
      status: row.active === 'true' ? 'active' : 'inactive',
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toNumber(value: string | number | null | undefined) {
    if (value == null) return null;
    return typeof value === 'number' ? value : Number(value);
  }

  private boolString(value: boolean) {
    return value ? 'true' : 'false';
  }
}

@Injectable()
export class HomeworkRepository {
  private readonly adapter: HomeworkRepositoryPort;

  constructor(filePath?: string) {
    this.adapter = isDbPersistenceEnabled() && !filePath ? new DbHomeworkRepository() : new FileHomeworkRepository(filePath);
  }

  listSubmissions() { return this.adapter.listSubmissions(); }
  findSubmissionById(submissionId: string) { return this.adapter.findSubmissionById(submissionId); }
  createSubmission(input: CreateHomeworkSubmissionRecord) { return this.adapter.createSubmission(input); }
  attachFiles(submissionId: string, fileIds: string[]) { return this.adapter.attachFiles(submissionId, fileIds); }
  listSubmissionFiles(submissionId: string) { return this.adapter.listSubmissionFiles(submissionId); }
  updateSubmission(submissionId: string, patch: Partial<HomeworkSubmission>) { return this.adapter.updateSubmission(submissionId, patch); }
  createAnalysis(record: Omit<HomeworkAiAnalysis, 'id' | 'createdAt'>) { return this.adapter.createAnalysis(record); }
  getLatestAnalysis(submissionId: string) { return this.adapter.getLatestAnalysis(submissionId); }
  getReviewBySubmissionId(submissionId: string) { return this.adapter.getReviewBySubmissionId(submissionId); }
  replaceReview(record: CreateHomeworkReviewRecord) { return this.adapter.replaceReview(record); }
  replaceReviewErrorItems(reviewId: string, items: Array<{ errorTaxonomyId: string; weight: number; note?: string }>) { return this.adapter.replaceReviewErrorItems(reviewId, items); }
  listReviewErrorItems(reviewId: string) { return this.adapter.listReviewErrorItems(reviewId); }
  getReviewDraft(submissionId: string) { return this.adapter.getReviewDraft(submissionId); }
  saveReviewDraft(submissionId: string, payload: {
    reviewerTeacherId?: string | null;
    reviewResult?: 'approved' | 'adjusted' | 'rejected';
    finalAccuracyPct?: number | null;
    finalErrorSummary?: string | null;
    finalSuggestion?: string | null;
    publishToFamily?: boolean;
    finalErrorItems?: Array<{ errorTaxonomyId: string; weight?: number; note?: string }>;
  }) { return this.adapter.saveReviewDraft(submissionId, payload); }
  deleteReviewDraft(submissionId: string) { return this.adapter.deleteReviewDraft(submissionId); }
  listErrorTaxonomies() { return this.adapter.listErrorTaxonomies(); }
  createErrorTaxonomy(input: Omit<HomeworkErrorTaxonomy, 'id' | 'createdAt' | 'updatedAt'>) { return this.adapter.createErrorTaxonomy(input); }
  updateErrorTaxonomy(taxonomyId: string, patch: Partial<Omit<HomeworkErrorTaxonomy, 'id' | 'createdAt' | 'updatedAt'>>) { return this.adapter.updateErrorTaxonomy(taxonomyId, patch); }
  deleteErrorTaxonomy(taxonomyId: string) { return this.adapter.deleteErrorTaxonomy(taxonomyId); }
  enqueueOutboxEvent(eventName: HomeworkOutboxEvent['eventName'], bizId: string, payload: Record<string, unknown>) { return this.adapter.enqueueOutboxEvent(eventName, bizId, payload); }
  listOutboxEvents() { return this.adapter.listOutboxEvents(); }
  runInTransaction<T>(runner: () => Promise<T> | T) { return this.adapter.runInTransaction(runner); }

  async getSubmissionOrThrow(submissionId: string) {
    const submission = await this.findSubmissionById(submissionId);
    if (!submission) throw new NotFoundException(`submission ${submissionId} not found`);
    return submission;
  }
}
