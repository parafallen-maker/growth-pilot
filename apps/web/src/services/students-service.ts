import { apiRequest, type PageResult } from '@/lib/api-client';
import type { Student360Aggregate } from '@growthpilot/schema';
import type { QueryBase } from '@/features/shared/types';

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
  detailHref: string;
};

const fallbackStudents: StudentItem[] = [
  { id: 'student-001', studentNo: 'S-1001', name: '张小北', grade: '三年级', campus: '贵阳主校区', teacher: 'teacher-001', family: '张家', accuracy: '93%', observation: '执行力稳定', balance: '¥0', status: 'active', detailHref: '/students/student-001' },
  { id: 'student-002', studentNo: 'S-1024', name: '林一诺', grade: '四年级', campus: '南明校区', teacher: 'teacher-002', family: '林家', accuracy: '88%', observation: '阅读表达提升中', balance: '¥1,280', status: 'trial', detailHref: '/students/student-002' },
];

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

const formatPercent = (value?: number | null) => (typeof value === 'number' ? `${value}%` : '--');
const formatCurrency = (amountCents?: number | null) => `¥${(((amountCents ?? 0) / 100)).toLocaleString('zh-CN')}`;
const formatStudentStatus = (value?: string | null) => {
  switch (value) {
    case 'active':
      return '在读';
    case 'trial':
      return '试听';
    case 'inactive':
      return '停读';
    default:
      return value ?? '--';
  }
};

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
    detailHref: `/students/${aggregate.student.id}`,
  };
}

export const studentService = {
  async query(params: QueryBase = {}): Promise<PageResult<StudentItem>> {
    try {
      const result = await apiRequest<PageResult<{
        id: string;
        studentNo: string;
        name: string;
        gradeLabel: string;
        familyId?: string | null;
        status: string;
      }>>(`/students${buildQuery(params)}`);

      const detailAggregates = await Promise.all(
        result.list.map(async (student) => {
          try {
            return await apiRequest<Student360Aggregate>(`/students/${student.id}/360`);
          } catch {
            return null;
          }
        }),
      );

      return {
        ...result,
        list: result.list.map((student, index) => {
          const aggregate = detailAggregates[index];
          if (!aggregate) {
            return {
              id: student.id,
              studentNo: student.studentNo,
              name: student.name,
              grade: student.gradeLabel,
              campus: '--',
              teacher: '--',
              family: student.familyId ?? '--',
              accuracy: '--',
              observation: '--',
              balance: '¥0',
              status: formatStudentStatus(student.status),
              detailHref: `/students/${student.id}`,
            };
          }
          return mapStudentAggregate(aggregate);
        }),
      };
    } catch {
      return {
        list: fallbackStudents,
        page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: fallbackStudents.length },
      };
    }
  },

  async detail360(id: string): Promise<Student360Aggregate | null> {
    try {
      return await apiRequest<Student360Aggregate>(`/students/${id}/360`);
    } catch {
      return null;
    }
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
