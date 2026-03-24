export interface HealthCheckDto {
  ok: boolean;
  service: 'web' | 'api';
}

export interface Teacher {
  id: string;
  campusId: string;
  employeeNo: string;
  name: string;
  mobile?: string;
  leadSubject?: string;
  status: string;
}

export interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender?: string;
  birthDate?: string | null;
  schoolName?: string;
  gradeLabel: string;
  className?: string;
  familyId?: string | null;
  status: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  campusId: string;
  termId: string;
  primaryTeacherId?: string | null;
  groupId?: string | null;
  enrollDate: string;
  leaveDate?: string | null;
  status: string;
}

export interface Family {
  id: string;
  familyCode: string;
  familyName?: string;
  primaryContactName?: string;
  primaryMobile?: string;
  familyStructure?: string;
  status: string;
}

export interface Guardian {
  id: string;
  familyId: string;
  name: string;
  relation: string;
  mobile?: string;
  isPrimary: boolean;
  isEmergency: boolean;
}

export type HomeworkAiStatus = 'pending' | 'running' | 'ready' | 'failed' | 'skipped';
export type HomeworkReviewStatus = 'unreviewed' | 'reviewing' | 'reviewed' | 'published';
export type HomeworkReviewResult = 'approved' | 'adjusted' | 'rejected';
export type HomeworkFamilyFeedbackStatus = 'draft' | 'ready' | 'published' | 'hidden';
export type AiJobStatus = 'queued' | 'running' | 'success' | 'failed' | 'canceled';

export interface HomeworkSubmission {
  id: string;
  submissionNo: string;
  studentId: string;
  campusId?: string;
  termId?: string;
  teacherId?: string;
  subject: string;
  homeworkDate: string;
  sourceType: string;
  sourceChannel: string;
  aiStatus: HomeworkAiStatus;
  reviewStatus: HomeworkReviewStatus;
  finalAccuracyPct?: number | null;
  finalErrorSummary?: string | null;
  familyFeedbackStatus: HomeworkFamilyFeedbackStatus;
  remark?: string;
  uploadedBy?: string | null;
  uploadedAt: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HomeworkSubmissionFile {
  id: string;
  submissionId: string;
  fileId: string;
  sortOrder: number;
  createdAt: string;
}

export interface HomeworkStructuredErrorItem {
  code?: string;
  label: string;
  evidence?: string;
}

export interface HomeworkAnalysisStructuredResult {
  accuracyPct: number;
  errorItems: HomeworkStructuredErrorItem[];
  summary: string;
  suggestion: string;
  confidence?: number;
}

export interface HomeworkAiAnalysis {
  id: string;
  submissionId: string;
  jobId?: string | null;
  provider: string;
  modelName: string;
  modelVersion?: string;
  promptVersion?: string;
  status: 'success' | 'failed' | 'canceled';
  rawMarkdown?: string;
  structuredOutput: HomeworkAnalysisStructuredResult;
  accuracyPct?: number | null;
  errorSummaryText?: string | null;
  suggestionText?: string | null;
  confidence?: number | null;
  durationMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface HomeworkReview {
  id: string;
  submissionId: string;
  reviewerTeacherId?: string | null;
  reviewResult: HomeworkReviewResult;
  finalAccuracyPct?: number | null;
  finalErrorSummary?: string | null;
  finalSuggestion?: string | null;
  publishToFamily: boolean;
  publishedAt?: string | null;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface HomeworkReviewErrorItem {
  id: string;
  reviewId: string;
  errorTaxonomyId: string;
  weight: number;
  note?: string;
  createdAt: string;
}

export interface HomeworkAnalysisAdapterInput {
  submissionId: string;
  subject: string;
  gradeLabel?: string;
  imageUrls: string[];
  promptVersion: string;
}

export interface HomeworkAnalysisAdapterOutput {
  rawMarkdown: string;
  structured: HomeworkAnalysisStructuredResult;
  meta?: {
    modelVersion?: string;
    durationMs?: number;
    inputTokens?: number;
    outputTokens?: number;
  };
}
