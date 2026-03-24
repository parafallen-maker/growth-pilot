import type { PageResult, QueryBase } from '@/features/shared/types';

type TeacherItem = { id: string; name: string; subject: string; campus: string; students: string; reviews: string; coverage: string; status: string };

const teachers: TeacherItem[] = [
  { id: 'T-001', name: '周老师', subject: '数学', campus: '贵阳主校区', students: '32', reviews: '8', coverage: '92%', status: '在岗' },
  { id: 'T-014', name: '吴老师', subject: '英语', campus: '南明校区', students: '24', reviews: '5', coverage: '87%', status: '在岗' },
];

export const teacherService = {
  query(params: QueryBase = {}): PageResult<TeacherItem> {
    return { list: teachers, page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: teachers.length } };
  },
  detail(id: string) {
    return {
      id,
      profile: [
        { name: '基础档案', detail: '工号 T-001 / 数学组 / 评级 A' },
        { name: '学科能力', detail: '数学建模、错因拆解、家长沟通' },
        { name: '班次/值班', detail: '周二-周日 13:00-21:00' },
      ],
      timeline: [
        { title: '发展记录 2026-Q1', detail: '完成教学复盘 4 次，待补 1 次公开课记录。' },
        { title: '带学生列表', detail: '挂接 32 名学生；后续接 A5 真接口聚合。' },
      ],
    };
  },
};
