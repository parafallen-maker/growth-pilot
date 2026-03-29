import { apiRequest } from '@/lib/api-client';
import { getAuthTokens } from '@/lib/auth-session';
import type { QueryBase, PageResult } from '@/features/shared/types';
import type { Family, Guardian, Student } from '@growthpilot/schema';

type FamilyItem = { id: string; code: string; name: string; contact: string; phone: string; students: string; balance: string; lastContact: string; status: string };

type FamilyDetail = {
  family: Family;
  guardians: Guardian[];
  students: Student[];
  billingSummary: Record<string, never>;
  tasks: unknown[];
  communications: unknown[];
};

export type CreateFamilyPayload = {
  familyCode?: string;
  familyName?: string;
  primaryContactName?: string;
  primaryMobile?: string;
  secondaryMobile?: string;
  familyStructure?: string;
  address?: string;
  communicationPreference?: string;
  notes?: string;
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
  if (status === 'active') return '正常';
  if (status === 'inactive') return '停用';
  return status;
}

export const familyService = {
  async query(params: QueryBase = {}): Promise<PageResult<FamilyItem>> {
    const auth = await getAuthTokens();
    const result = await apiRequest<PageResult<Family>>(`/families${buildQuery(params)}`, { auth, retryOn401: Boolean(auth.refreshToken) });
    return {
      ...result,
      list: result.list.map((family) => ({
        id: family.id,
        code: family.familyCode,
        name: family.familyName ?? family.primaryContactName ?? family.familyCode,
        contact: family.primaryContactName ?? '--',
        phone: family.primaryMobile ?? '--',
        students: '--',
        balance: '--',
        lastContact: '--',
        status: formatStatus(family.status),
      })),
    };
  },

  async detail(id: string): Promise<FamilyDetail> {
    const auth = await getAuthTokens();
    return apiRequest<FamilyDetail>(`/families/${id}`, { auth, retryOn401: Boolean(auth.refreshToken) });
  },

  async create(payload: CreateFamilyPayload): Promise<Family> {
    const auth = await getAuthTokens();
    return apiRequest<Family>('/families', {
      method: 'POST',
      body: payload,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },
};
