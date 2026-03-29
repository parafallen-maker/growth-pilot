import { ConflictException, Injectable } from '@nestjs/common';
import type { HomeworkAnalysisStatus, HomeworkSubmission } from '@growthpilot/schema/index';
import { normalizePage } from '../../../common/base-list-query.dto';
import type { PageResult } from '../../../common/api-response';
import { FilesService } from '../../files/service/files.service';
import { JobsService } from '../../jobs/service/jobs.service';
import { HomeworkErrorTaxonomyQueryDto, CreateHomeworkErrorTaxonomyDto, UpdateHomeworkErrorTaxonomyDto } from '../dto/homework-error-taxonomy.dto';
import { BulkApplyHomeworkReviewTagsDto, BulkTriggerHomeworkAnalysisDto } from '../dto/bulk-homework-actions.dto';
import { HomeworkEventPublisher } from '../event/homework-event.publisher';
import { HomeworkAnalysisQueue } from '../job/homework-analysis.queue';
import { CreateHomeworkSubmissionDto } from '../dto/create-homework-submission.dto';
import {
  resolveHomeworkAiProvider,
  resolveHomeworkModelName,
  resolveHomeworkPromptVersion,
  resolveHomeworkProviderLabel,
} from '../adapter/homework-analysis-config';
import { HomeworkReviewDraftDto } from '../dto/homework-review-draft.dto';
import { HomeworkReviewDto } from '../dto/homework-review.dto';
import { HomeworkSubmissionQueryDto } from '../dto/homework-submission-query.dto';
import { TriggerHomeworkAnalysisDto } from '../dto/trigger-analysis.dto';
import { HomeworkErrorTaxonomy, HomeworkRepository } from '../repository/homework.repository';

@Injectable()
export class HomeworkService {
  constructor(
    private readonly homeworkRepository: HomeworkRepository,
    private readonly homeworkAnalysisQueue: HomeworkAnalysisQueue,
    private readonly homeworkEventPublisher: HomeworkEventPublisher,
    private readonly filesService: FilesService,
    private readonly jobsService: JobsService,
  ) {}

  async listSubmissions(query: HomeworkSubmissionQueryDto): Promise<PageResult<HomeworkSubmission>> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = (await this.homeworkRepository.listSubmissions()).filter((item) => {
      if (query.campusId && item.campusId !== query.campusId) return false;
      if (query.termId && item.termId !== query.termId) return false;
      if (query.teacherId && item.teacherId !== query.teacherId) return false;
      if (query.subject && item.subject !== query.subject) return false;
      if (query.aiStatus && item.aiStatus !== query.aiStatus) return false;
      if (query.reviewStatus && item.reviewStatus !== query.reviewStatus) return false;
      if (query.dateFrom && item.homeworkDate < query.dateFrom) return false;
      if (query.dateTo && item.homeworkDate > query.dateTo) return false;
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        return [item.submissionNo, item.subject, item.remark]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(keyword));
      }
      return true;
    });

    const start = (pageNo - 1) * pageSize;
    return { list: filtered.slice(start, start + pageSize), page: { pageNo, pageSize, total: filtered.length } };
  }

  async getSubmissionDetail(submissionId: string) {
    const submission = await this.homeworkRepository.getSubmissionOrThrow(submissionId);
    return {
      submission,
      files: await this.homeworkRepository.listSubmissionFiles(submissionId),
      latestAiAnalysis: (await this.homeworkRepository.getLatestAnalysis(submissionId)) ?? null,
      review: (await this.homeworkRepository.getReviewBySubmissionId(submissionId)) ?? null,
      reviewDraft: await this.homeworkRepository.getReviewDraft(submissionId),
      analysisStatus: await this.getAnalysisStatus(submissionId),
    };
  }

  async getAnalysisStatus(submissionId: string): Promise<HomeworkAnalysisStatus> {
    const submission = await this.homeworkRepository.getSubmissionOrThrow(submissionId);
    const latestAnalysis = (await this.homeworkRepository.getLatestAnalysis(submissionId)) ?? null;
    const jobPage = await this.jobsService.listJobs({ jobType: 'homework_analysis', bizType: 'homework_submission' });
    const latestJob = jobPage.list.find((item) => item.bizId === submissionId) ?? null;

    return {
      submissionId,
      aiStatus: submission.aiStatus,
      reviewStatus: submission.reviewStatus,
      latestJob,
      latestAnalysis,
    };
  }

  async createSubmission(payload: CreateHomeworkSubmissionDto) {
    if (!payload.fileIds?.length) throw new ConflictException('fileIds is required');
    await this.filesService.assertFileAssetsExist(payload.fileIds);

    const submission = await this.homeworkRepository.createSubmission({
      studentId: payload.studentId,
      campusId: payload.campusId,
      termId: payload.termId,
      teacherId: payload.teacherId,
      subject: payload.subject,
      homeworkDate: payload.homeworkDate,
      sourceType: payload.sourceType ?? 'teacher_upload',
      sourceChannel: 'web',
      remark: payload.remark,
      uploadedBy: payload.teacherId ?? null,
    });

    await this.homeworkRepository.attachFiles(submission.id, payload.fileIds);
    await this.homeworkEventPublisher.publish('HomeworkSubmitted', submission.id, {
      submissionNo: submission.submissionNo,
      studentId: submission.studentId,
      fileCount: payload.fileIds.length,
    });
    return submission;
  }

  async triggerAnalysis(submissionId: string, payload: TriggerHomeworkAnalysisDto, idempotencyKey?: string) {
    const resolvedProvider = payload.provider?.trim() || resolveHomeworkProviderLabel();
    const resolvedModelName = payload.modelName?.trim() || resolveHomeworkModelName();
    const resolvedPromptVersion = payload.promptVersion?.trim() || resolveHomeworkPromptVersion();

    const job = await this.homeworkAnalysisQueue.enqueueAndProcess({
      submissionId,
      force: payload.force,
      idempotencyKey,
      provider: resolvedProvider,
      modelName: resolvedModelName,
      promptVersion: resolvedPromptVersion,
    });

    return { jobId: job.jobId, status: job.status };
  }

  async bulkTriggerAnalysis(payload: BulkTriggerHomeworkAnalysisDto) {
    const submissionIds = Array.from(new Set(payload.submissionIds.map((item) => item.trim()).filter(Boolean)));
    const results = [] as Array<{ submissionId: string; jobId: string; status: string }>;

    for (const submissionId of submissionIds) {
      const job = await this.triggerAnalysis(submissionId, payload, `bulk-analysis:${submissionId}`);
      results.push({ submissionId, jobId: job.jobId, status: job.status });
    }

    return { count: results.length, submissionIds, results };
  }

  async bulkApplyReviewTags(payload: BulkApplyHomeworkReviewTagsDto) {
    const submissionIds = Array.from(new Set(payload.submissionIds.map((item) => item.trim()).filter(Boolean)));
    const mode = payload.mode ?? 'merge';
    const finalErrorItems = payload.finalErrorItems.map((item) => ({
      errorTaxonomyId: item.errorTaxonomyId,
      weight: item.weight ?? 1,
      note: item.note,
    }));
    const results = [] as Array<{ submissionId: string; reviewStatus: string; tagCount: number }>;

    for (const submissionId of submissionIds) {
      const currentDraft = await this.homeworkRepository.getReviewDraft(submissionId);
      const mergedItems = mode === 'replace'
        ? finalErrorItems
        : Array.from(new Map<string, { errorTaxonomyId: string; weight: number; note?: string }>([
          ...((currentDraft?.finalErrorItems ?? []).map((item): [string, { errorTaxonomyId: string; weight: number; note?: string }] => [
            item.errorTaxonomyId,
            { errorTaxonomyId: item.errorTaxonomyId, weight: item.weight ?? 1, note: item.note },
          ])),
          ...(finalErrorItems.map((item): [string, { errorTaxonomyId: string; weight: number; note?: string }] => [item.errorTaxonomyId, item])),
        ]).values());

      await this.homeworkRepository.runInTransaction(async () => {
        await this.homeworkRepository.saveReviewDraft(submissionId, {
          reviewerTeacherId: payload.reviewerTeacherId ?? currentDraft?.reviewerTeacherId ?? undefined,
          reviewResult: currentDraft?.reviewResult,
          finalAccuracyPct: currentDraft?.finalAccuracyPct,
          finalErrorSummary: payload.finalErrorSummary ?? currentDraft?.finalErrorSummary,
          finalSuggestion: currentDraft?.finalSuggestion,
          publishToFamily: currentDraft?.publishToFamily ?? false,
          finalErrorItems: mergedItems,
        });
        await this.homeworkRepository.updateSubmission(submissionId, { reviewStatus: 'reviewing' });
      });

      const updatedSubmission = await this.homeworkRepository.getSubmissionOrThrow(submissionId);
      results.push({ submissionId, reviewStatus: updatedSubmission.reviewStatus ?? 'reviewing', tagCount: mergedItems.length });
    }

    return { count: results.length, submissionIds, results, mode };
  }

  async getReviewDraft(submissionId: string) {
    await this.homeworkRepository.getSubmissionOrThrow(submissionId);
    return this.homeworkRepository.getReviewDraft(submissionId);
  }

  async saveReviewDraft(submissionId: string, payload: HomeworkReviewDraftDto) {
    return this.homeworkRepository.runInTransaction(async () => {
      const draft = await this.homeworkRepository.saveReviewDraft(submissionId, payload);
      await this.homeworkRepository.updateSubmission(submissionId, { reviewStatus: 'reviewing' });
      return draft;
    });
  }

  async submitReview(submissionId: string, payload: HomeworkReviewDto) {
    return this.homeworkRepository.runInTransaction(async () => {
      const submission = await this.homeworkRepository.getSubmissionOrThrow(submissionId);
      if (submission.reviewStatus === 'published') throw new ConflictException('published review can not be overwritten');

      const review = await this.homeworkRepository.replaceReview({
        submissionId,
        reviewerTeacherId: payload.reviewerTeacherId ?? submission.teacherId ?? null,
        reviewResult: payload.reviewResult,
        finalAccuracyPct: payload.finalAccuracyPct ?? null,
        finalErrorSummary: payload.finalErrorSummary ?? null,
        finalSuggestion: payload.finalSuggestion ?? null,
        publishToFamily: payload.publishToFamily ?? false,
        publishedAt: payload.publishToFamily ? new Date().toISOString() : null,
      });

      const reviewErrorItems = await this.homeworkRepository.replaceReviewErrorItems(
        review.id,
        (payload.finalErrorItems ?? []).map((item) => ({ errorTaxonomyId: item.errorTaxonomyId, weight: item.weight ?? 1, note: item.note })),
      );

      await this.homeworkRepository.updateSubmission(submissionId, {
        reviewStatus: payload.publishToFamily ? 'published' : 'reviewed',
        familyFeedbackStatus: payload.publishToFamily ? 'published' : 'ready',
        finalAccuracyPct: payload.finalAccuracyPct ?? null,
        finalErrorSummary: payload.finalErrorSummary ?? null,
        publishedAt: payload.publishToFamily ? new Date().toISOString() : null,
      });
      await this.homeworkRepository.deleteReviewDraft(submissionId);

      await this.homeworkEventPublisher.publish('HomeworkReviewed', submissionId, {
        reviewId: review.id,
        reviewResult: payload.reviewResult,
        errorItemCount: reviewErrorItems.length,
      });

      return { reviewId: review.id, reviewStatus: (await this.homeworkRepository.getSubmissionOrThrow(submissionId)).reviewStatus };
    });
  }

  async listErrorTaxonomies(query: HomeworkErrorTaxonomyQueryDto): Promise<HomeworkErrorTaxonomy[]> {
    return (await this.homeworkRepository.listErrorTaxonomies()).filter((item) => {
      if (query.status && item.status !== query.status) return false;
      if (query.subject && item.subject !== query.subject) return false;
      if (query.keyword) {
        const haystack = [item.code, item.name, item.description, item.subject, item.stageScope].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query.keyword.toLowerCase())) return false;
      }
      return true;
    });
  }

  createErrorTaxonomy(payload: CreateHomeworkErrorTaxonomyDto) {
    return this.homeworkRepository.createErrorTaxonomy({
      code: payload.code,
      name: payload.name,
      subject: payload.subject,
      stageScope: payload.stageScope,
      description: payload.description,
      status: payload.status ?? 'active',
      sortOrder: payload.sortOrder ?? 100,
    });
  }

  updateErrorTaxonomy(taxonomyId: string, payload: UpdateHomeworkErrorTaxonomyDto) {
    return this.homeworkRepository.updateErrorTaxonomy(taxonomyId, payload);
  }

  async deleteErrorTaxonomy(taxonomyId: string) {
    await this.homeworkRepository.deleteErrorTaxonomy(taxonomyId);
    return { deleted: true, taxonomyId };
  }

  listOutboxEvents() {
    return this.homeworkRepository.listOutboxEvents();
  }
}
