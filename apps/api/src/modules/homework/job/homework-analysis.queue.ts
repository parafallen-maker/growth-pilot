import { Inject, Injectable } from '@nestjs/common';
import { FilesService } from '../../files/service/files.service';
import { JobsService } from '../../jobs/service/jobs.service';
import { HOMEWORK_ANALYSIS_ADAPTER, HomeworkAnalysisAdapter } from '../adapter/homework-analysis.adapter';
import { HomeworkRepository } from '../repository/homework.repository';

@Injectable()
export class HomeworkAnalysisQueue {
  constructor(
    private readonly jobsService: JobsService,
    private readonly homeworkRepository: HomeworkRepository,
    private readonly filesService: FilesService,
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
    const submission = await this.homeworkRepository.getSubmissionOrThrow(input.submissionId);
    return this.jobsService.enqueueAndProcess({
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
    }, async ({ jobId }) => {
      await this.homeworkRepository.updateSubmission(submission.id, { aiStatus: 'running' });

      try {
        const analysis = await this.homeworkAnalysisAdapter.analyze({
          submissionId: submission.id,
          subject: submission.subject,
          gradeLabel: undefined,
          imageUrls: await this.filesService.resolveFileUrls(
            (await this.homeworkRepository.listSubmissionFiles(submission.id)).map((item) => item.fileId),
          ),
          promptVersion: input.promptVersion,
        });

        const savedAnalysis = await this.homeworkRepository.createAnalysis({
          submissionId: submission.id,
          jobId,
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

        await this.homeworkRepository.updateSubmission(submission.id, {
          aiStatus: 'ready',
          finalAccuracyPct: submission.finalAccuracyPct,
        });

        return { analysisId: savedAnalysis.id, submissionId: submission.id };
      } catch (error) {
        await this.homeworkRepository.updateSubmission(submission.id, { aiStatus: 'failed' });
        throw error;
      }
    });
  }
}
