import { apiRequest } from '@/lib/api-client';
import { getAuthTokens } from '@/lib/auth-session';
import type { QueryBase, PageResult } from '@/features/shared/types';
import type { Teacher } from '@growthpilot/schema';

type TeacherItem = {
  id: string;
  employeeNo: string;
  name: string;
  subject: string;
  campus: string;
  students: string;
  reviews: string;
  coverage: string;
  status: string;
};

type TeacherDetail = {
  teacher: Teacher;
  subjects: Array<{ subject: string; gradeRange?: string; level?: string }>;
  shifts: Array<{ id: string; weekday: number; startTime: string; endTime: string; shiftType: string }>;
  developmentRecords: Array<{ id: string; recordType: string; title: string; status: string; occurredAt: string }>;
};

export type CreateTeacherPayload = {
  campusId: string;
  employeeNo: string;
  name: string;
  mobile?: string;
  email?: string;
  hireDate?: string;
  leadSubject?: string;
  status?: string;
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

function formatStatus(status: string) {
  if (status === 'active') return '在岗';
  if (status === 'inactive') return '离岗';
  return status;
}

function campusName(campusId: string) {
  const map: Record<string, string> = {
    'campus-guanshanhu': '观山湖校区',
    'campus-nanming': '南明校区',
    'campus-guiyang': '贵阳主校区',
  };
  return map[campusId] ?? campusId;
}

export const teacherService = {
  async query(params: QueryBase = {}): Promise<PageResult<TeacherItem>> {
    const auth = await getAuthTokens();
    const result = await apiRequest<PageResult<Teacher>>(`/teachers${buildQuery(params)}`, { auth, retryOn401: Boolean(auth.refreshToken) });
    return {
      ...result,
      list: result.list.map((teacher) => ({
        id: teacher.id,
        employeeNo: teacher.employeeNo,
        name: teacher.name,
        subject: teacher.leadSubject ?? '--',
        campus: campusName(teacher.campusId),
        students: '--',
        reviews: '--',
        coverage: '--',
        status: formatStatus(teacher.status),
      })),
    };
  },

  async detail(id: string): Promise<TeacherDetail> {
    const auth = await getAuthTokens();
    return apiRequest<TeacherDetail>(`/teachers/${id}`, { auth, retryOn401: Boolean(auth.refreshToken) });
  },

  async create(payload: CreateTeacherPayload): Promise<Teacher> {
    const auth = await getAuthTokens();
    return apiRequest<Teacher>('/teachers', {
      method: 'POST',
      body: payload,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },
};
