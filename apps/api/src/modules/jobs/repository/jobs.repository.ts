import { Injectable } from '@nestjs/common';
import type { AiJobStatus } from '@growthpilot/schema/index';
import { randomUUID } from 'node:crypto';
import { FileJsonStore } from '../../../shared/persistence/file-json-store';

export interface JobRecord {
  jobId: string;
  jobType: string;
  bizType: string;
  bizId: string;
  status: AiJobStatus;
  progress: number;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  attempts: number;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
  queuedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

interface JobsStoreShape {
  jobs: JobRecord[];
}

@Injectable()
export class JobsRepository {
  private readonly store = new FileJsonStore<JobsStoreShape>('.data/jobs.json', () => ({
    jobs: [
      {
        jobId: 'job-homework-analysis-001',
        jobType: 'homework_analysis',
        bizType: 'homework_submission',
        bizId: 'submission-001',
        status: 'running',
        progress: 65,
        result: null,
        errorMessage: null,
        attempts: 1,
        queuedAt: '2026-03-24T09:00:00.000Z',
        startedAt: '2026-03-24T09:01:00.000Z',
        finishedAt: null,
      },
      {
        jobId: 'job-report-generate-001',
        jobType: 'growth_report_generate',
        bizType: 'growth_report',
        bizId: 'report-001',
        status: 'success',
        progress: 100,
        result: { reportId: 'report-001' },
        errorMessage: null,
        attempts: 1,
        queuedAt: '2026-03-24T10:00:00.000Z',
        startedAt: '2026-03-24T10:01:00.000Z',
        finishedAt: '2026-03-24T10:03:00.000Z',
      },
    ],
  }));

  list(filters?: { status?: string; jobType?: string; bizType?: string }) {
    return this.store.read().jobs.filter((job) => {
      if (filters?.status && job.status !== filters.status) return false;
      if (filters?.jobType && job.jobType !== filters.jobType) return false;
      if (filters?.bizType && job.bizType !== filters.bizType) return false;
      return true;
    });
  }

  findById(jobId: string) {
    return this.store.read().jobs.find((job) => job.jobId === jobId);
  }

  findActiveJob(jobType: string, bizType: string, bizId: string) {
    return this.store.read().jobs.find(
      (job) => job.jobType === jobType && job.bizType === bizType && job.bizId === bizId && ['queued', 'running'].includes(job.status),
    );
  }

  create(input: Omit<JobRecord, 'jobId' | 'progress' | 'result' | 'errorMessage' | 'attempts' | 'queuedAt' | 'startedAt' | 'finishedAt'> & { status?: AiJobStatus }) {
    const now = new Date().toISOString();
    const job: JobRecord = {
      ...input,
      jobId: `job-${input.jobType}-${randomUUID()}`,
      status: input.status ?? 'queued',
      progress: input.status === 'success' ? 100 : 0,
      result: null,
      errorMessage: null,
      attempts: 0,
      queuedAt: now,
      startedAt: null,
      finishedAt: null,
    };
    this.store.update((state) => {
      state.jobs.unshift(job);
    });
    return job;
  }

  update(jobId: string, patch: Partial<JobRecord>) {
    return this.store.update((state) => {
      const job = state.jobs.find((item) => item.jobId === jobId);
      if (!job) return undefined;
      Object.assign(job, patch);
      return job;
    });
  }
}
