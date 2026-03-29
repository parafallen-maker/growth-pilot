import { Inject, Injectable } from '@nestjs/common';
import { FilesService } from '../../files/service/files.service';
import { BullmqJobBroker } from '../../jobs/queue/bullmq-job-broker';
import { HOMEWORK_ANALYSIS_JOB, HOMEWORK_ANALYSIS_QUEUE } from '../../jobs/queue/job-queue.constants';
import { HomeworkAnalysisDispatchInput, HomeworkAnalysisJobPayload } from '../../jobs/queue/job-queue.types';
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
    private readonly bullmqJobBroker: BullmqJobBroker = new BullmqJobBroker(),
  ) {}

  async enqueueAndProcess(input: HomeworkAnalysisDispatchInput) {
    const submission = await this.homeworkRepository.getSubmissionOrThrow(input.submissionId);
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

    const payload: HomeworkAnalysisJobPayload = { ...input, jobId: job.jobId };
    const queued = await this.bullmqJobBroker.enqueue(HOMEWORK_ANALYSIS_QUEUE, HOMEWORK_ANALYSIS_JOB, job.jobId, payload);
    if (queued) {
      return this.jobsService.getJob(job.jobId);
    }

    await this.executeQueuedJob(payload);
    return this.jobsService.getJob(job.jobId);
  }

  async executeQueuedJob(input: HomeworkAnalysisJobPayload) {
    return this.jobsService.processJob(input.jobId, async ({ jobId }) => {
      const submission = await this.homeworkRepository.getSubmissionOrThrow(input.submissionId);
      await this.homeworkRepository.updateSubmission(submission.id, { aiStatus: 'running' });

      try {
        const analysis = await this.homeworkAnalysisAdapter.analyze({
          submissionId: submission.id,
          subject: submission.subject,
          gradeLabel: undefined,
          imageUrls: await this.filesService.resolveFileUrls(
            (await this.homeworkRepository.listSubmissionFiles(submission.id)).map((item) => item.fileId),
          ),
          provider: input.provider,
          modelName: input.modelName,
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
