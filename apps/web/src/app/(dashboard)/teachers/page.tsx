import Link from 'next/link';
import { DataTable, FilterBar, PageHeader } from '@/components/business/page-blocks';
import { queryKeys } from '@/features/shared/query-keys';
import { teacherService } from '@/services/teachers-service';

export default async function TeachersPage() {
  const filters = { pageNo: 1, pageSize: 20, keyword: '', status: 'active', sortBy: 'updatedAt', sortOrder: 'desc' } as const;
  const result = await teacherService.query(filters);

  return (
    <div className="stack">
      <PageHeader
        title="教师列表"
        description="教师档案与工作管理"
        actions={<><button className="btn primary">新建教师</button><button className="btn">导出</button></>}
      />
      <FilterBar fields={[{ label: '关键词', value: '姓名 / 工号' }, { label: '校区', value: '全部校区', kind: 'select' }, { label: '状态', value: '在岗', kind: 'select' }, { label: '学科', value: '全部学科', kind: 'select' }]} />
      <DataTable
        title={`教师列表（共 ${result.page.total} 条）`}
        columns={['工号', '姓名', '主学科', '校区', '在带学生数', '待复核作业', '观察覆盖率', '状态', '操作']}
        rows={result.list.map((item) => [item.employeeNo, item.name, item.subject, item.campus, item.students, item.reviews, item.coverage, item.status, `/teachers/${item.id}`])}
      />
      {result.list[0] ? <div className="button-row"><Link className="btn" href={`/teachers/${result.list[0].id}`}>打开首位教师详情</Link></div> : null}
    </div>
  );
}
