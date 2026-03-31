import { apiRequest, type PageResult } from '@/lib/api-client';
import { getAuthTokens } from '@/lib/auth-session';
import type { QueryBase } from '@/features/shared/types';

type UserApiItem = { id: string; username: string; displayName: string; roles: string[]; campusIds: string[]; status: string };
type UserItem = { id: string; username: string; name: string; role: string; campus: string; status: string; permissionScope: string };
type CampusItem = { id: string; code: string; name: string; status: string };
type TermItem = { id: string; campusId: string; code: string; name: string; startDate: string; endDate: string; status: string };
type DictionaryItem = { id: string; dictType: string; code: string; label: string; value: string };
type RoleCatalogItem = DictionaryItem & { scopeLevel: 'system' | 'campus'; status: string; permissionCount: number };
type PermissionCatalogItem = DictionaryItem & { module: string; action: string };
type SettingItem = { name: string; detail: string };
type JobItem = {
  jobId: string;
  jobType: string;
  bizType: string;
  bizId: string;
  status: string;
  progress: number;
  errorMessage?: string | null;
  queuedAt: string;
  finishedAt?: string | null;
};

const ACCESS_ROLE_DICT_TYPE = 'access_role';
const ACCESS_PERMISSION_DICT_TYPE = 'access_permission';

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

function formatUserStatus(status?: string) {
  if (status === 'active') return '启用';
  if (status === 'inactive') return '停用';
  return status ?? '--';
}

function formatScopeLevel(scopeLevel?: string) {
  if (scopeLevel === 'system') return '系统级';
  if (scopeLevel === 'campus') return '校区级';
  return scopeLevel ?? '--';
}

function formatPermissionAction(action?: string) {
  if (!action) return '--';
  if (action === 'view') return '查看';
  if (action === 'read') return '读取';
  if (action === 'manage') return '管理';
  if (action === 'bind') return '绑定';
  return action;
}

export const settingsService = {
  async query(params: QueryBase = {}): Promise<PageResult<UserItem>> {
    const auth = await getAuthTokens();
    const [result, campusesResult] = await Promise.all([
      apiRequest<PageResult<UserApiItem>>(`/users${buildQuery({ keyword: params.keyword, pageNo: params.pageNo, pageSize: params.pageSize })}`, { auth, retryOn401: Boolean(auth.refreshToken) }),
      apiRequest<PageResult<CampusItem>>('/settings/campuses?pageNo=1&pageSize=200', { auth, retryOn401: Boolean(auth.refreshToken) }),
    ]);
    const campusNameById = new Map(campusesResult.list.map((campus) => [campus.id, campus.name]));
    return {
      ...result,
      list: result.list.map((user) => ({
        id: user.id,
        username: user.username,
        name: user.displayName,
        role: user.roles.join('、') || '--',
        campus: campusName(user.campusIds.map((campusId) => campusNameById.get(campusId) ?? campusId)),
        status: formatUserStatus(user.status),
        permissionScope: user.campusIds.length ? '校区' : '全局',
      })),
    };
  },

  async queryAccessCatalog() {
    const auth = await getAuthTokens();
    const [roleCatalog, permissionCatalog] = await Promise.all([
      apiRequest<PageResult<RoleCatalogItem>>(`/settings/dictionaries?dictType=${ACCESS_ROLE_DICT_TYPE}`, { auth, retryOn401: Boolean(auth.refreshToken) }),
      apiRequest<PageResult<PermissionCatalogItem>>(`/settings/dictionaries?dictType=${ACCESS_PERMISSION_DICT_TYPE}`, { auth, retryOn401: Boolean(auth.refreshToken) }),
    ]);

    const roles = roleCatalog.list.map((role) => ({
      name: `${role.label} (${role.code})`,
      detail: `${formatScopeLevel(role.scopeLevel)} / ${formatUserStatus(role.status)} / ${role.permissionCount} 个权限点`,
    }));

    const permissionsByModule = permissionCatalog.list.reduce<Map<string, string[]>>((map, permission) => {
      const group = map.get(permission.module) ?? [];
      group.push(permission.code);
      group.sort((left, right) => left.localeCompare(right, 'zh-CN'));
      map.set(permission.module, group);
      return map;
    }, new Map());
    const permissionModules = [...permissionsByModule.entries()]
      .sort((left, right) => left[0].localeCompare(right[0], 'zh-CN'))
      .map(([module, permissions]) => ({
        name: `${module} (${permissions.length})`,
        detail: permissions.slice(0, 4).join(' / '),
      }));
    const currentPermissions = permissionCatalog.list.slice(0, 8).map((permission) => ({
      name: permission.code,
      detail: `${permission.label} / 模块 ${permission.module} / 动作 ${formatPermissionAction(permission.action)}`,
    }));

    return {
      roles: roles.length
        ? roles
        : [{ name: '角色目录', detail: '暂无角色数据' }],
      permissionModules: permissionModules.length
        ? permissionModules
        : [{ name: '权限模块', detail: '暂无权限模块' }],
      currentPermissions: currentPermissions.length
        ? currentPermissions
        : [{ name: '权限目录', detail: '暂无权限数据' }],
    };
  },

  async detail(canReadJobs = false) {
    const auth = await getAuthTokens();
    const [campusesResult, termsResult, dictionariesResult, jobsResult] = await Promise.all([
      apiRequest<PageResult<CampusItem>>('/settings/campuses', { auth, retryOn401: Boolean(auth.refreshToken) }),
      apiRequest<PageResult<TermItem>>('/settings/terms', { auth, retryOn401: Boolean(auth.refreshToken) }),
      apiRequest<PageResult<DictionaryItem>>('/settings/dictionaries', { auth, retryOn401: Boolean(auth.refreshToken) }),
      canReadJobs
        ? apiRequest<PageResult<JobItem>>('/jobs', { auth, retryOn401: Boolean(auth.refreshToken) }).catch(() => null)
        : Promise.resolve(null),
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
    const jobs: SettingItem[] = canReadJobs
      ? (jobsResult?.list.length
          ? jobsResult.list.map((job) => ({
              name: `${job.jobType} / ${job.status}`,
              detail: `${job.jobId} · ${job.bizType}:${job.bizId} · ${job.progress}% · queued ${job.queuedAt.replace('T', ' ').slice(0, 16)}${job.finishedAt ? ` · finished ${job.finishedAt.replace('T', ' ').slice(0, 16)}` : ''}${job.errorMessage ? ` · ${job.errorMessage}` : ''}`,
            }))
          : [{ name: 'AI 任务中心', detail: '当前筛选范围内暂无任务' }])
      : [{ name: 'AI 任务中心', detail: '当前登录用户缺少 jobs.read 权限，无法读取任务列表。' }];

    return {
      campuses,
      terms,
      dictionaries,
      jobs,
    };
  },
};
