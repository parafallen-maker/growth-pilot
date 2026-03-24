import { Inject, Injectable } from '@nestjs/common';
import { JobsService } from '../../jobs/service/jobs.service';
import { HOMEWORK_ANALYSIS_ADAPTER, HomeworkAnalysisAdapter } from '../adapter/homework-analysis.adapter';
import { HomeworkRepository } from '../repository/homework.repository';

@Injectable()
export class HomeworkAnalysisQueue {
  constructor(
    private readonly jobsService: JobsService,
    private readonly homeworkRepository: HomeworkRepository,
    @Inject(HOMEWORK_ANALYSIS_ADAPTER)
    private readonly homeworkAnalysisAdapter: HomeworkAnalysisAdapter,
  ) {}

  async enqueueAndProcess(input: {
    submissionId: string;
    provider: string;
    modelName: string;
    promptVersion: string;
    force?: boolean;
    idempotencyKey?: string;
  }) {
    const submission = this.homeworkRepository.getSubmissionOrThrow(input.submissionId);
    const job = this.jobsService.createJob({
      jobType: 'homework_analysis',
      bizType: 'homework_submission',
      bizId: submission.id,
      idempotencyKey: input.idempotencyKey,
      force: input.force,
      payload: {
        provider: input.provider,
        modelName: input.modelName,
        promptVersion: input.promptVersion,
      },
    });

    this.jobsService.markRunning(job.jobId);
    this.homeworkRepository.updateSubmission(submission.id, { aiStatus: 'running' });

    try {
      const analysis = await this.homeworkAnalysisAdapter.analyze({
        submissionId: submission.id,
        subject: submission.subject,
        gradeLabel: undefined,
        imageUrls: this.homeworkRepository
          .listSubmissionFiles(submission.id)
          .map((item) => `mock://file-assets/${item.fileId}`),
        promptVersion: input.promptVersion,
      });

      const savedAnalysis = this.homeworkRepository.createAnalysis({
        submissionId: submission.id,
        jobId: job.jobId,
        provider: input.provider,
        modelName: input.modelName,
        modelVersion: analysis.meta?.modelVersion,
        promptVersion: input.promptVersion,
        status: 'success',
        rawMarkdown: analysis.rawMarkdown,
        structuredOutput: analysis.structured,
        accuracyPct: analysis.structured.accuracyPct,
        errorSummaryText: analysis.structured.summary,
        suggestionText: analysis.structured.suggestion,
        confidence: analysis.structured.confidence ?? null,
        durationMs: analysis.meta?.durationMs ?? null,
        inputTokens: analysis.meta?.inputTokens ?? null,
        outputTokens: analysis.meta?.outputTokens ?? null,
        errorMessage: null,
      });

      this.homeworkRepository.updateSubmission(submission.id, {
        aiStatus: 'ready',
        finalAccuracyPct: submission.finalAccuracyPct,
      });
      this.jobsService.markSuccess(job.jobId, { analysisId: savedAnalysis.id, submissionId: submission.id });
      return job;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown analysis error';
      this.homeworkRepository.updateSubmission(submission.id, { aiStatus: 'failed' });
      this.jobsService.markFailed(job.jobId, message);
      throw error;
    }
  }
}
