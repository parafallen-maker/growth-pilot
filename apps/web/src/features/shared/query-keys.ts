import type { QueryBase } from './types';

export const queryKeys = {
  dashboardOverview: (filters: QueryBase = {}) => ['analytics-overview', filters] as const,
  users: (filters: QueryBase = {}) => ['users', filters] as const,
  settingsCampuses: (filters: QueryBase = {}) => ['settings-campuses', filters] as const,
  settingsTerms: (filters: QueryBase = {}) => ['settings-terms', filters] as const,
  settingsDictionaries: (filters: QueryBase = {}) => ['settings-dictionaries', filters] as const,
  jobs: (filters: QueryBase = {}) => ['jobs', filters] as const,
  teachers: (filters: QueryBase = {}) => ['teachers', filters] as const,
  teacherDetail: (teacherId: string) => ['teacher-detail', teacherId] as const,
  students: (filters: QueryBase = {}) => ['students', filters] as const,
  studentDetail: (studentId: string) => ['student-detail', studentId] as const,
  families: (filters: QueryBase = {}) => ['families', filters] as const,
  familyDetail: (familyId: string) => ['family-detail', familyId] as const,
  homeworkSubmissions: (filters: QueryBase & { subject?: string; teacherId?: string; aiStatus?: string; reviewStatus?: string; dateFrom?: string; dateTo?: string } = {}) => ['homework-submissions', filters] as const,
  homeworkSubmissionDetail: (submissionId: string) => ['homework-submission-detail', submissionId] as const,
  homeworkReviewDraft: (submissionId: string) => ['homework-review-draft', submissionId] as const,
  homeworkErrorTaxonomies: (filters: QueryBase = {}) => ['homework-error-taxonomies', filters] as const,
};
