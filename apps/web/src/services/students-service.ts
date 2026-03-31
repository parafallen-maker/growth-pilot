import { apiRequest, type PageResult } from '@/lib/api-client';
import { getAuthTokens } from '@/lib/auth-session';
import { studentStatusLabels } from '@/lib/enums';
import type { Student360Aggregate } from '@growthpilot/schema';
import type { QueryBase } from '@/features/shared/types';

export type StudentQuery = QueryBase & {
  campusId?: string;
  termId?: string;
  status?: string;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

type StudentListItem = {
  id: string;
  studentNo: string;
  name: string;
  gradeLabel: string;
  familyId?: string | null;
  status: string;
};

export type CreateStudentPayload = {
  studentNo: string;
  name: string;
  gender?: string;
  birthDate?: string;
  schoolName?: string;
  gradeLabel: string;
  className?: string;
  familyId?: string;
  photoFileId?: string;
  profileNotes?: string;
  tags?: string[];
};

type StudentItem = {
  id: string;
  studentNo: string;
  name: string;
  grade: string;
  campus: string;
  teacher: string;
  family: string;
  accuracy: string;
  observation: string;
  balance: string;
  status: string;
  rawStatus: string;
  detailHref: string;
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

const formatPercent = (value?: number | null) => (typeof value === 'number' ? `${value}%` : '--');
const formatCurrency = (amountCents?: number | null) => `¥${((amountCents ?? 0) / 100).toLocaleString('zh-CN')}`;
const formatStudentStatus = (value?: string | null) => studentStatusLabels[value ?? ''] ?? value ?? '--';

function mapStudentAggregate(aggregate: Student360Aggregate): StudentItem {
  return {
    id: aggregate.student.id,
    studentNo: aggregate.student.studentNo,
    name: aggregate.student.name,
    grade: aggregate.student.gradeLabel,
    campus: aggregate.currentEnrollment?.campusId ?? '--',
    teacher: aggregate.currentEnrollment?.primaryTeacherId ?? '--',
    family: aggregate.family?.familyName ?? aggregate.family?.primaryContactName ?? '--',
    accuracy: formatPercent(aggregate.homeworkSummary.averageAccuracyPct),
    observation: aggregate.growthSummary.latestImprovementNotes ?? aggregate.growthSummary.latestStrengths ?? '--',
    balance: formatCurrency(aggregate.billingSummary.outstandingAmount),
    status: formatStudentStatus(aggregate.student.status),
    rawStatus: aggregate.student.status,
    detailHref: `/students/${aggregate.student.id}`,
  };
}

export const studentService = {
  async query(params: StudentQuery = {}): Promise<PageResult<StudentItem>> {
    const auth = await getAuthTokens();
    const result = await apiRequest<PageResult<StudentListItem>>(`/students${buildQuery(params)}`, { auth, retryOn401: Boolean(auth.refreshToken) });

    const list = result.list.map((student) => ({
      id: student.id,
      studentNo: student.studentNo,
      name: student.name,
      grade: student.gradeLabel,
      campus: '--',
      teacher: '--',
      family: student.familyId ?? '--',
      accuracy: '--',
      observation: '--',
      balance: '--',
      status: formatStudentStatus(student.status),
      rawStatus: student.status,
      detailHref: `/students/${student.id}`,
    }));

    return {
      ...result,
      list,
      page: {
        ...result.page,
        pageNo: params.pageNo ?? result.page.pageNo,
        pageSize: params.pageSize ?? result.page.pageSize,
        total: result.page.total,
      },
    };
  },

  async detail360(id: string): Promise<Student360Aggregate> {
    const auth = await getAuthTokens();
    return apiRequest<Student360Aggregate>(`/students/${id}/360`, { auth, retryOn401: Boolean(auth.refreshToken) });
  },

  async create(payload: CreateStudentPayload) {
    const auth = await getAuthTokens();
    return apiRequest<{ id: string; studentNo: string; name: string }>(`/students`, {
      method: 'POST',
      body: payload,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },

  async listImportJobs() {
    const auth = await getAuthTokens();
    return apiRequest<Array<{
      jobId: string;
      status: string;
      progress: number;
      queuedAt: string;
      finishedAt: string | null;
      result: {
        totalRows?: number;
        validRows?: number;
        invalidRows?: number;
        errors?: Array<{ rowNumber: number; field?: string; message: string }>;
      } | null;
      errorMessage: string | null;
    }>>('/jobs?jobType=students_import', { auth, retryOn401: Boolean(auth.refreshToken) });
  },

  async update(id: string, payload: { name?: string; gradeLabel?: string; gender?: string; status?: string; familyId?: string }) {
    const auth = await getAuthTokens();
    return apiRequest<{ id: string }>(`/students/${id}`, {
      method: 'PATCH',
      body: payload,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },

  action() {
    return {
      template: 'student-import-template.xlsx',
      fieldMappings: [
        { title: '学号', detail: 'studentNo' },
        { title: '姓名', detail: 'name' },
        { title: '年级', detail: 'gradeLabel' },
        { title: '班级', detail: 'className' },
        { title: '家庭编码', detail: 'familyCode' },
        { title: '校区', detail: 'campusId' },
        { title: '学期', detail: 'termId' },
        { title: '主班老师', detail: 'primaryTeacherId' },
      ],
    };
  },
};
