export interface HomeworkAnalysisDispatchInput {
  submissionId: string;
  provider: string;
  modelName: string;
  promptVersion: string;
  force?: boolean;
  idempotencyKey?: string;
}

export interface HomeworkAnalysisJobPayload extends HomeworkAnalysisDispatchInput {
  jobId: string;
}

export interface GrowthReportDraftDispatchInput {
  reportType: 'weekly' | 'monthly';
  periodKey: string;
  studentIds: string[];
  termId?: string;
}

export interface GrowthReportDraftJobPayload {
  jobId: string;
  request: GrowthReportDraftDispatchInput;
}
