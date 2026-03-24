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
  dueDate?: string;
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
