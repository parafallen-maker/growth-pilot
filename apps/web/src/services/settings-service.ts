import type { PageResult, QueryBase } from '@/features/shared/types';

type UserItem = { id: string; name: string; role: string; campus: string; status: string; permissionScope: string };
type SettingItem = { name: string; detail: string };

const users: UserItem[] = [
  { id: 'U-001', name: '陈校长', role: 'super_admin', campus: '贵阳主校区', status: '启用', permissionScope: '全局' },
  { id: 'U-018', name: '王老师', role: 'subject_teacher', campus: '南明校区', status: '启用', permissionScope: '教师域' },
  { id: 'U-031', name: '李顾问', role: 'growth_advisor', campus: '观山湖校区', status: '停用中', permissionScope: '成长域' },
];

const campuses: SettingItem[] = [
  { name: '贵阳主校区', detail: '状态：启用 / 容量：320' },
  { name: '南明校区', detail: '状态：筹备中 / 容量：180' },
];
const terms: SettingItem[] = [
  { name: '2026 春季', detail: '起止：2026-02 至 2026-07' },
  { name: '2026 暑期', detail: '起止：2026-07 至 2026-08' },
];
const dictionaries: SettingItem[] = [
  { name: '学生状态', detail: '在读 / 试听 / 结课 / 停课' },
  { name: '任务类型', detail: 'homework_analysis / report_generate' },
];
const jobs: SettingItem[] = [
  { name: 'job_001', detail: 'homework_analysis / running / 65%' },
  { name: 'job_002', detail: 'students_import / failed / 可重试' },
];

export const settingsService = {
  query(params: QueryBase = {}): PageResult<UserItem> {
    return { list: users, page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: users.length } };
  },
  detail() {
    return { campuses, terms, dictionaries, jobs };
  },
};
