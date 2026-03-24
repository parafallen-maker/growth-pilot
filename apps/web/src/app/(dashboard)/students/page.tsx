import Link from 'next/link';
import { DataTable, FilterBar, PageHeader } from '@/components/business/page-blocks';
import { queryKeys } from '@/features/shared/query-keys';
import { studentService } from '@/services/students-service';

export default function StudentsPage() {
  const result = studentService.query({ pageNo: 1, pageSize: 20, keyword: '', campusId: 'all', termId: '2026-spring', status: '在读', sortBy: 'updatedAt', sortOrder: 'desc' });

  return (
    <div className="stack">
      <PageHeader
        title="学生列表页骨架"
        description={`P03 已放好服务端分页/筛选栏/批量动作占位。query key: ${JSON.stringify(queryKeys.students({ pageNo: 1, pageSize: 20, termId: '2026-spring' }))}`}
        actions={<><button className="btn primary">新建学生</button><Link className="btn" href="/students/import">导入学生</Link><button className="btn">批量打标签</button><button className="btn">导出</button></>}
      />
      <FilterBar fields={[{ label: '关键词', value: '姓名 / 学号 / 家庭' }, { label: '校区', value: '全部校区', kind: 'select' }, { label: '学期', value: '2026 春季', kind: 'select' }, { label: '年级', value: '全部年级', kind: 'select' }, { label: '老师', value: '全部老师', kind: 'select' }, { label: '状态', value: '在读', kind: 'select' }]} />
      <DataTable
        title="学生列表"
        columns={['学号', '姓名', '年级', '校区', '当前老师', '家庭主联系人', '最近作业正确率', '本周成长观察', '当前未收余额', '状态']}
        rows={result.list.map((item) => [item.id, item.name, item.grade, item.campus, item.teacher, item.family, item.accuracy, item.observation, item.balance, item.status])}
      />
    </div>
  );
}
