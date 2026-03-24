import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { JobsRepository } from '../repository/jobs.repository';

@Injectable()
export class JobsService {
  constructor(private readonly jobsRepository: JobsRepository) {}

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
    return this.ensureUpdated(jobId, { status: 'running', progress: 15, errorMessage: null });
  }

  markSuccess(jobId: string, result: Record<string, unknown>) {
    return this.ensureUpdated(jobId, { status: 'success', progress: 100, result, errorMessage: null });
  }

  markFailed(jobId: string, errorMessage: string) {
    return this.ensureUpdated(jobId, { status: 'failed', progress: 100, errorMessage });
  }

  private ensureUpdated(jobId: string, patch: Parameters<JobsRepository['update']>[1]) {
    const job = this.jobsRepository.update(jobId, patch);
    if (!job) {
      throw new NotFoundException('job not found');
    }
    return job;
  }
}
