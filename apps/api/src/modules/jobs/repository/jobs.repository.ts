import { Injectable } from '@nestjs/common';

export interface JobRecord {
  jobId: string;
  jobType: string;
  bizType: string;
  bizId: string;
  status: string;
  progress: number;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
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
      status: 'succeeded',
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
}
