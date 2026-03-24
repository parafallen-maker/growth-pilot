import type { PageResult, QueryBase } from '@/features/shared/types';

type StudentItem = { id: string; name: string; grade: string; campus: string; teacher: string; family: string; accuracy: string; observation: string; balance: string; status: string };

const students: StudentItem[] = [
  { id: 'S-1001', name: '张小北', grade: '三年级', campus: '贵阳主校区', teacher: '周老师', family: '张家', accuracy: '93%', observation: '执行力稳定', balance: '¥0', status: '在读' },
  { id: 'S-1024', name: '林一诺', grade: '四年级', campus: '南明校区', teacher: '吴老师', family: '林家', accuracy: '88%', observation: '阅读表达提升中', balance: '¥1,280', status: '试听' },
];

export const studentService = {
  query(params: QueryBase = {}): PageResult<StudentItem> {
    return { list: students, page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: students.length } };
  },
  detail(id: string) {
    return {
      id,
      summary: [
        { name: '学生基础卡', detail: '主档 + 在读档 + 标签，后续接 students/{id} 与 360 聚合。' },
        { name: '最近动态', detail: '作业复核、成长观察、家庭沟通入口位已预留。' },
      ],
    };
  },
  action() {
    return {
      template: 'student-import-template.xlsx',
      jobs: [
        { title: '导入任务 GP-IMP-001', detail: 'running / 82% / 已校验 186 行' },
        { title: '字段映射', detail: '学号 -> studentNo；班级 -> enrollment.className' },
      ],
    };
  },
};
