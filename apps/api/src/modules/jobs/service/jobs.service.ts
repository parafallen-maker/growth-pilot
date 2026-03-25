import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { buildPagedResult } from '../../../shared/api-response';
import { JobsRepository } from '../repository/jobs.repository';

export interface JobExecutionContext {
  jobId: string;
  attempt: number;
  payload?: Record<string, unknown>;
}

export type JobExecutionHandler<TResult extends Record<string, unknown> = Record<string, unknown>> =
  (context: JobExecutionContext) => Promise<TResult> | TResult;

@Injectable()
export class JobsService {
  constructor(private readonly jobsRepository: JobsRepository) {}

  listJobs(filters?: { status?: string; jobType?: string; bizType?: string }) {
    return buildPagedResult(this.jobsRepository.list(filters));
  }

  getJob(jobId: string) {
    const job = this.jobsRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException('job not found');
    }

    return job;
  }

  createJob(input: {
    jobType: string;
    bizType: string;
    bizId: string;
    idempotencyKey?: string;
    payload?: Record<string, unknown>;
    force?: boolean;
  }) {
    const activeJob = this.jobsRepository.findActiveJob(input.jobType, input.bizType, input.bizId);
    if (activeJob && !input.force) {
      throw new ConflictException(`active job already exists: ${activeJob.jobId}`);
    }

    return this.jobsRepository.create({
      jobType: input.jobType,
      bizType: input.bizType,
      bizId: input.bizId,
      status: 'queued',
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
    });
  }

  markRunning(jobId: string) {
    return this.ensureUpdated(jobId, {
      status: 'running',
      progress: 15,
      attempts: (this.getJob(jobId).attempts ?? 0) + 1,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      errorMessage: null,
    });
  }

  markSuccess(jobId: string, result: Record<string, unknown>) {
    return this.ensureUpdated(jobId, { status: 'success', progress: 100, result, errorMessage: null, finishedAt: new Date().toISOString() });
  }

  markFailed(jobId: string, errorMessage: string) {
    return this.ensureUpdated(jobId, { status: 'failed', progress: 100, errorMessage, finishedAt: new Date().toISOString() });
  }

  retry(jobId: string) {
    const job = this.getJob(jobId);
    return this.ensureUpdated(jobId, {
      status: 'queued',
      progress: 0,
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
      attempts: job.attempts,
    });
  }

  processJobSync<TResult extends Record<string, unknown> = Record<string, unknown>>(jobId: string, handler: (context: JobExecutionContext) => TResult) {
    const running = this.markRunning(jobId);

    try {
      const result = handler({
        jobId,
        attempt: running.attempts,
        payload: running.payload,
      });
      this.markSuccess(jobId, result ?? {});
      return this.getJob(jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown job execution error';
      this.markFailed(jobId, message);
      throw error;
    }
  }

  async processJob<TResult extends Record<string, unknown> = Record<string, unknown>>(jobId: string, handler: JobExecutionHandler<TResult>) {
    const running = this.markRunning(jobId);

    try {
      const result = await handler({
        jobId,
        attempt: running.attempts,
        payload: running.payload,
      });
      this.markSuccess(jobId, result ?? {});
      return this.getJob(jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown job execution error';
      this.markFailed(jobId, message);
      throw error;
    }
  }

  async enqueueAndProcess<TResult extends Record<string, unknown> = Record<string, unknown>>(
    input: {
      jobType: string;
      bizType: string;
      bizId: string;
      idempotencyKey?: string;
      payload?: Record<string, unknown>;
      force?: boolean;
    },
    handler: JobExecutionHandler<TResult>,
  ) {
    const job = this.createJob(input);
    await this.processJob(job.jobId, handler);
    return this.getJob(job.jobId);
  }

  private ensureUpdated(jobId: string, patch: Parameters<JobsRepository['update']>[1]) {
    const job = this.jobsRepository.update(jobId, patch);
    if (!job) {
      throw new NotFoundException('job not found');
    }
    return job;
  }
}
