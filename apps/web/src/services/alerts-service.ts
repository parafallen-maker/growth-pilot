import { apiRequest } from '@/lib/api-client';
import { getAuthTokens } from '@/lib/auth-session';
import type { QueryBase, PageResult } from '@/features/shared/types';
import type { Alert, AlertLevel, AlertStatus } from '@growthpilot/schema';

export type AlertQuery = QueryBase & {
  studentId?: string;
  familyId?: string;
  invoiceId?: string;
  alertType?: string;
  alertLevel?: AlertLevel | 'all';
  status?: AlertStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
};

export type AlertListItem = {
  id: string;
  type: string;
  level: AlertLevel;
  status: AlertStatus;
  title: string;
  detail: string;
  studentId?: string | null;
  familyId?: string | null;
  invoiceId?: string | null;
  triggeredAt: string;
  resolverUserId?: string | null;
  resolvedAt?: string | null;
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

function normalizeAlert(alert: Alert): AlertListItem {
  return {
    id: alert.id,
    type: alert.alertType,
    level: alert.alertLevel,
    status: alert.status,
    title: alert.title,
    detail: alert.content,
    studentId: alert.studentId ?? null,
    familyId: alert.familyId ?? null,
    invoiceId: alert.invoiceId ?? null,
    triggeredAt: alert.createdAt.slice(0, 10),
    resolverUserId: alert.resolverUserId ?? null,
    resolvedAt: alert.resolvedAt ?? null,
  };
}

export const alertsService = {
  async query(params: AlertQuery = {}): Promise<PageResult<AlertListItem>> {
    const auth = await getAuthTokens();
    const result = await apiRequest<PageResult<Alert>>(`/alerts${buildQuery(params)}`, {
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });

    return {
      ...result,
      list: result.list.map(normalizeAlert),
    };
  },

  async update(alertId: string, payload: { status?: AlertStatus; resolverUserId?: string; resolvedAt?: string; content?: string }) {
    const auth = await getAuthTokens();
    return apiRequest<Alert>(`/alerts/${alertId}`, {
      method: 'PATCH',
      body: payload,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },
};
