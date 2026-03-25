import Link from 'next/link';
import { DataTable, FilterBar, PageHeader } from '@/components/business/page-blocks';
import { queryKeys } from '@/features/shared/query-keys';
import { familyService } from '@/services/families-service';

export default async function FamiliesPage() {
  const filters = { pageNo: 1, pageSize: 20, keyword: '', status: 'active', sortBy: 'updatedAt', sortOrder: 'desc' } as const;
  const result = await familyService.query(filters);

  return (
    <div className="stack">
      <PageHeader
        title="家庭列表"
        description={`真实数据来自 GET /families。query key: ${JSON.stringify(queryKeys.families({ pageNo: 1, pageSize: 20, status: 'active' }))}`}
        actions={<><button className="btn primary">新建家庭</button><button className="btn">导出</button>{result.list[0] ? <Link className="btn" href={`/families/${result.list[0].id}`}>打开首个家庭详情</Link> : null}</>}
      />
      <FilterBar fields={[{ label: '关键词', value: '家庭名 / 联系人 / 电话' }, { label: '校区', value: '全部校区', kind: 'select' }, { label: '状态', value: '正常', kind: 'select' }, { label: '未收余额', value: '全部', kind: 'select' }, { label: '待办任务', value: '全部', kind: 'select' }]} />
      <DataTable
        title={`家庭列表（共 ${result.page.total} 条）`}
        columns={['家庭编码', '家庭名称', '主联系人', '电话', '关联学生数', '未收余额', '最近沟通时间', '状态']}
        rows={result.list.map((item) => [item.code, item.name, item.contact, item.phone, item.students, item.balance, item.lastContact, item.status])}
      />
    </div>
  );
}
