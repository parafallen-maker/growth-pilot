import { apiRequest, type PageResult } from '@/lib/api-client';
import { getAuthTokens } from '@/lib/auth-session';
import type { QueryBase } from '@/features/shared/types';

type UserApiItem = { id: string; username: string; displayName: string; roles: string[]; campusIds: string[] };
type UserItem = { id: string; username: string; name: string; role: string; campus: string; status: string; permissionScope: string };
type CampusItem = { id: string; code: string; name: string; status: string };
type TermItem = { id: string; campusId: string; code: string; name: string; startDate: string; endDate: string; status: string };
type DictionaryItem = { id: string; dictType: string; code: string; label: string; value: string };
type SettingItem = { name: string; detail: string };

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

function campusName(campusIds: string[]) {
  if (!campusIds.length) return '全局';
  return campusIds.join('、');
}

export const settingsService = {
  async query(params: QueryBase = {}): Promise<PageResult<UserItem>> {
    const auth = await getAuthTokens();
    const result = await apiRequest<PageResult<UserApiItem>>(`/users${buildQuery({ keyword: params.keyword })}`, { auth, retryOn401: Boolean(auth.refreshToken) });
    return {
      ...result,
      list: result.list.map((user) => ({
        id: user.id,
        username: user.username,
        name: user.displayName,
        role: user.roles.join('、') || '--',
        campus: campusName(user.campusIds),
        status: '启用',
        permissionScope: user.campusIds.length ? '校区' : '全局',
      })),
    };
  },

  async detail() {
    const auth = await getAuthTokens();
    const [campusesResult, termsResult, dictionariesResult] = await Promise.all([
      apiRequest<PageResult<CampusItem>>('/settings/campuses', { auth, retryOn401: Boolean(auth.refreshToken) }),
      apiRequest<PageResult<TermItem>>('/settings/terms', { auth, retryOn401: Boolean(auth.refreshToken) }),
      apiRequest<PageResult<DictionaryItem>>('/settings/dictionaries', { auth, retryOn401: Boolean(auth.refreshToken) }),
    ]);

    const campuses: SettingItem[] = campusesResult.list.map((campus) => ({
      name: campus.name,
      detail: `${campus.code} / 状态：${campus.status}`,
    }));
    const terms: SettingItem[] = termsResult.list.map((term) => ({
      name: term.name,
      detail: `${term.code} / ${term.startDate} ~ ${term.endDate} / ${term.status}`,
    }));
    const dictionaryGroups = new Map<string, DictionaryItem[]>();
    dictionariesResult.list.forEach((item) => {
      const group = dictionaryGroups.get(item.dictType) ?? [];
      group.push(item);
      dictionaryGroups.set(item.dictType, group);
    });
    const dictionaries: SettingItem[] = [...dictionaryGroups.entries()].map(([dictType, items]) => ({
      name: dictType,
      detail: items.map((item) => `${item.label}(${item.value})`).join(' / '),
    }));

    return {
      campuses,
      terms,
      dictionaries,
      jobs: [{ name: 'AI 任务中心', detail: '当前后端未提供 settings jobs 接口，先展示 settings 真数据，不再走本地 mock。' }],
    };
  },
};
