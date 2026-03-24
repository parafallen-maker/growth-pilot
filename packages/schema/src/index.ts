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


export interface FileAsset {
  id: string;
  storageProvider: string;
  bucketName: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string | null;
  uploadedBy?: string | null;
  createdAt: string;
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

export interface Student360HomeworkSummary {
  latestSubmissionId?: string | null;
  latestHomeworkDate?: string | null;
  reviewedCount: number;
  pendingReviewCount: number;
  averageAccuracyPct?: number | null;
  latestFeedback?: string | null;
  trend: Array<{
    date: string;
    accuracyPct: number;
  }>;
}

export interface Student360GrowthSummary {
  latestObservationDate?: string | null;
  observationCount: number;
  activeGoalCount: number;
  latestReportPeriod?: string | null;
  latestStrengths?: string | null;
  latestImprovementNotes?: string | null;
}

export interface Student360AttendanceSummary {
  lastAttendanceDate?: string | null;
  presentDays: number;
  absentDays: number;
  lateCount: number;
  averageStudyMinutes: number;
}

export interface Student360BillingSummary {
  activeContractCount: number;
  unpaidInvoiceCount: number;
  outstandingAmount: number;
  balanceAmount: number;
  latestPaymentDate?: string | null;
}

export interface Student360TimelineItem {
  id: string;
  type: string;
  title: string;
  occurredAt: string;
  status?: string;
  summary?: string;
}

export interface Student360Aggregate {
  student: Student;
  currentEnrollment: Enrollment | null;
  family: Family | null;
  guardians: Guardian[];
  homeworkSummary: Student360HomeworkSummary;
  growthSummary: Student360GrowthSummary;
  attendanceSummary: Student360AttendanceSummary;
  billingSummary: Student360BillingSummary;
  recentTimeline: Student360TimelineItem[];
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

export interface RubricDimension {
  id: string;
  templateId: string;
  code: string;
  name: string;
  weight: number;
  scoreMin: number;
  scoreMax: number;
  description?: string;
  sortOrder: number;
}

export interface RubricTemplate {
  id: string;
  campusId?: string | null;
  termId?: string | null;
  name: string;
  stageScope?: string;
  status: string;
  description?: string;
  dimensions: RubricDimension[];
  createdAt: string;
  updatedAt: string;
}

export interface GrowthObservationScore {
  dimensionId: string;
  score: number;
  note?: string;
}

export interface GrowthObservation {
  id: string;
  studentId: string;
  termId?: string | null;
  teacherId?: string | null;
  templateId: string;
  observationDate: string;
  scene: string;
  scores: GrowthObservationScore[];
  totalScore: number;
  strengths?: string;
  improvementNotes?: string;
  publishToFamily: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthGoalCheckin {
  id: string;
  goalId: string;
  checkinDate: string;
  progressValue?: number;
  progressNote?: string;
  nextAction?: string;
  createdAt: string;
}

export interface GrowthGoal {
  id: string;
  studentId: string;
  termId?: string | null;
  goalType: string;
  title: string;
  description?: string;
  ownerRole?: string;
  metricType?: string;
  baselineValue?: number;
  targetValue?: number;
  currentValue?: number;
  startDate?: string;
  dueDate?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  checkins: GrowthGoalCheckin[];
}

export interface GrowthReport {
  id: string;
  studentId: string;
  termId?: string | null;
  reportType: string;
  periodKey: string;
  status: string;
  title?: string;
  draftMarkdown?: string;
  summaryJson: Record<string, unknown>;
  generatedByJobId?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  billingMode: string;
  priceCents: number;
  unit?: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingContract {
  id: string;
  contractNo: string;
  campusId?: string | null;
  termId?: string | null;
  familyId: string;
  studentId: string;
  signDate: string;
  startDate: string;
  endDate: string;
  totalAmountCents: number;
  discountAmountCents: number;
  payableAmountCents: number;
  status: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingContractItem {
  id: string;
  contractId: string;
  productId?: string | null;
  itemName: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
  createdAt: string;
}

export interface BillingInvoice {
  id: string;
  invoiceNo: string;
  contractId?: string | null;
  familyId: string;
  studentId: string;
  billingPeriod?: string;
  issueDate: string;
  dueDate?: string;
  amountCents: number;
  status: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingInvoiceItem {
  id: string;
  invoiceId: string;
  itemName: string;
  productId?: string | null;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
  remark?: string;
  createdAt: string;
}

export interface BillingPayment {
  id: string;
  invoiceId: string;
  paymentNo: string;
  paidAmountCents: number;
  paymentTime: string;
  channel: string;
  transactionNo?: string | null;
  status: string;
  idempotencyKey?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingRefund {
  id: string;
  paymentId: string;
  refundNo: string;
  refundAmountCents: number;
  refundTime: string;
  reason?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobStatus {
  jobId: string;
  jobType: string;
  bizType: string;
  bizId: string;
  status: string;
  progress: number;
  result: Record<string, unknown> | null;
  errorMessage?: string | null;
}

