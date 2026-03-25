import { ConflictException, Injectable } from '@nestjs/common';
import type { HomeworkSubmission } from '@growthpilot/schema/index';
import { normalizePage } from '../../../common/base-list-query.dto';
import type { PageResult } from '../../../common/api-response';
import { FilesService } from '../../files/service/files.service';
import { HomeworkErrorTaxonomyQueryDto, CreateHomeworkErrorTaxonomyDto, UpdateHomeworkErrorTaxonomyDto } from '../dto/homework-error-taxonomy.dto';
import { HomeworkEventPublisher } from '../event/homework-event.publisher';
import { HomeworkAnalysisQueue } from '../job/homework-analysis.queue';
import { CreateHomeworkSubmissionDto } from '../dto/create-homework-submission.dto';
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
  ) {}

  listSubmissions(query: HomeworkSubmissionQueryDto): PageResult<HomeworkSubmission> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.homeworkRepository.listSubmissions().filter((item) => {
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
    return {
      list: filtered.slice(start, start + pageSize),
      page: { pageNo, pageSize, total: filtered.length },
    };
  }

  getSubmissionDetail(submissionId: string) {
    const submission = this.homeworkRepository.getSubmissionOrThrow(submissionId);
    return {
      submission,
      files: this.homeworkRepository.listSubmissionFiles(submissionId),
      latestAiAnalysis: this.homeworkRepository.getLatestAnalysis(submissionId) ?? null,
      review: this.homeworkRepository.getReviewBySubmissionId(submissionId) ?? null,
      reviewDraft: this.homeworkRepository.getReviewDraft(submissionId),
    };
  }

  createSubmission(payload: CreateHomeworkSubmissionDto) {
    if (!payload.fileIds?.length) {
      throw new ConflictException('fileIds is required');
    }

    this.filesService.assertFileAssetsExist(payload.fileIds);

    const submission = this.homeworkRepository.createSubmission({
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

    this.homeworkRepository.attachFiles(submission.id, payload.fileIds);
    this.homeworkEventPublisher.publish('HomeworkSubmitted', submission.id, {
      submissionNo: submission.submissionNo,
      studentId: submission.studentId,
      fileCount: payload.fileIds.length,
    });

    return submission;
  }

  async triggerAnalysis(submissionId: string, payload: TriggerHomeworkAnalysisDto, idempotencyKey?: string) {
    const job = await this.homeworkAnalysisQueue.enqueueAndProcess({
      submissionId,
      force: payload.force,
      idempotencyKey,
      provider: payload.provider ?? 'mock-provider',
      modelName: payload.modelName ?? 'mock-vision-v1',
      promptVersion: payload.promptVersion ?? 'homework-review-v3',
    });

    return {
      jobId: job.jobId,
      status: job.status,
    };
  }

  getReviewDraft(submissionId: string) {
    this.homeworkRepository.getSubmissionOrThrow(submissionId);
    return this.homeworkRepository.getReviewDraft(submissionId);
  }

  saveReviewDraft(submissionId: string, payload: HomeworkReviewDraftDto) {
    return this.homeworkRepository.runInTransaction(() => {
      const draft = this.homeworkRepository.saveReviewDraft(submissionId, payload);
      this.homeworkRepository.updateSubmission(submissionId, {
        reviewStatus: 'reviewing',
      });
      return draft;
    });
  }

  submitReview(submissionId: string, payload: HomeworkReviewDto) {
    return this.homeworkRepository.runInTransaction(() => {
      const submission = this.homeworkRepository.getSubmissionOrThrow(submissionId);
      if (submission.reviewStatus === 'published') {
        throw new ConflictException('published review can not be overwritten');
      }

      const review = this.homeworkRepository.replaceReview({
        submissionId,
        reviewerTeacherId: payload.reviewerTeacherId ?? submission.teacherId ?? null,
        reviewResult: payload.reviewResult,
        finalAccuracyPct: payload.finalAccuracyPct ?? null,
        finalErrorSummary: payload.finalErrorSummary ?? null,
        finalSuggestion: payload.finalSuggestion ?? null,
        publishToFamily: payload.publishToFamily ?? false,
        publishedAt: payload.publishToFamily ? new Date().toISOString() : null,
      });

      const reviewErrorItems = this.homeworkRepository.replaceReviewErrorItems(
        review.id,
        (payload.finalErrorItems ?? []).map((item) => ({
          errorTaxonomyId: item.errorTaxonomyId,
          weight: item.weight ?? 1,
          note: item.note,
        })),
      );

      this.homeworkRepository.updateSubmission(submissionId, {
        reviewStatus: payload.publishToFamily ? 'published' : 'reviewed',
        familyFeedbackStatus: payload.publishToFamily ? 'published' : 'ready',
        finalAccuracyPct: payload.finalAccuracyPct ?? null,
        finalErrorSummary: payload.finalErrorSummary ?? null,
        publishedAt: payload.publishToFamily ? new Date().toISOString() : null,
      });
      this.homeworkRepository.deleteReviewDraft(submissionId);

      this.homeworkEventPublisher.publish('HomeworkReviewed', submissionId, {
        reviewId: review.id,
        reviewResult: payload.reviewResult,
        errorItemCount: reviewErrorItems.length,
      });

      return {
        reviewId: review.id,
        reviewStatus: this.homeworkRepository.getSubmissionOrThrow(submissionId).reviewStatus,
      };
    });
  }

  listErrorTaxonomies(query: HomeworkErrorTaxonomyQueryDto): HomeworkErrorTaxonomy[] {
    return this.homeworkRepository.listErrorTaxonomies().filter((item) => {
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

  deleteErrorTaxonomy(taxonomyId: string) {
    this.homeworkRepository.deleteErrorTaxonomy(taxonomyId);
    return { deleted: true, taxonomyId };
  }

  listOutboxEvents() {
    return this.homeworkRepository.listOutboxEvents();
  }
}
