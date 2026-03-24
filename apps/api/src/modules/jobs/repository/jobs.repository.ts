import { Injectable } from '@nestjs/common';
import type { AiJobStatus } from '@growthpilot/schema/index';

export interface JobRecord {
  jobId: string;
  jobType: string;
  bizType: string;
  bizId: string;
  status: AiJobStatus;
  progress: number;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class JobsRepository {
  private readonly jobs: JobRecord[] = [
    {
      jobId: 'job-homework-analysis-001',
      jobType: 'homework_analysis',
      bizType: 'homework_submission',
      bizId: 'submission-001',
      status: 'running',
      progress: 65,
      result: null,
      errorMessage: null,
    },
    {
      jobId: 'job-report-generate-001',
      jobType: 'growth_report_generate',
      bizType: 'growth_report',
      bizId: 'report-001',
      status: 'success',
      progress: 100,
      result: {
        reportId: 'report-001',
      },
      errorMessage: null,
    },
  ];

  findById(jobId: string) {
    return this.jobs.find((job) => job.jobId === jobId);
  }

  findActiveJob(jobType: string, bizType: string, bizId: string) {
    return this.jobs.find(
      (job) => job.jobType === jobType && job.bizType === bizType && job.bizId === bizId && ['queued', 'running'].includes(job.status),
    );
  }

  create(input: Omit<JobRecord, 'jobId' | 'progress' | 'result' | 'errorMessage'> & { status?: AiJobStatus }) {
    const job: JobRecord = {
      ...input,
      jobId: `job-${input.jobType}-${String(this.jobs.length + 1).padStart(3, '0')}`,
      status: input.status ?? 'queued',
      progress: input.status === 'success' ? 100 : 0,
      result: null,
      errorMessage: null,
    };
    this.jobs.unshift(job);
    return job;
  }

  update(jobId: string, patch: Partial<JobRecord>) {
    const job = this.findById(jobId);
    if (!job) return undefined;
    Object.assign(job, patch);
    return job;
  }
}
