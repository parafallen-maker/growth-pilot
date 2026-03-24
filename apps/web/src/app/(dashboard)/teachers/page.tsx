import Link from 'next/link';
import { DataTable, FilterBar, PageHeader, StateBlock } from '@/components/business/page-blocks';
import { queryKeys } from '@/features/shared/query-keys';
import { teacherService } from '@/services/teachers-service';

export default function TeachersPage() {
  const result = teacherService.query({ pageNo: 1, pageSize: 20, keyword: '', status: '在岗', sortBy: 'updatedAt', sortOrder: 'desc' });

  return (
    <div className="stack">
      <PageHeader
        title="教师列表页骨架"
        description={`P08 落地列表/筛选/导出位。query key: ${JSON.stringify(queryKeys.teachers({ pageNo: 1, pageSize: 20, status: '在岗' }))}`}
        actions={<><button className="btn primary">新建教师</button><button className="btn">导出</button></>}
      />
      <FilterBar fields={[{ label: '关键词', value: '姓名 / 工号' }, { label: '校区', value: '全部校区', kind: 'select' }, { label: '状态', value: '在岗', kind: 'select' }, { label: '学科', value: '全部学科', kind: 'select' }]} />
      <DataTable
        title="教师列表"
        columns={['工号', '姓名', '主学科', '校区', '在带学生数', '待复核作业', '观察覆盖率', '状态', '操作']}
        rows={result.list.map((item) => [item.id, item.name, item.subject, item.campus, item.students, item.reviews, item.coverage, item.status, `查看 -> /teachers/${item.id}`])}
      />
      <div className="button-row"><Link className="btn" href="/teachers/T-001">打开教师详情骨架</Link></div>
      <StateBlock state="empty" title="筛选结果为空" />
    </div>
  );
}
