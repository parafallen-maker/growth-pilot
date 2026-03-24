import Link from 'next/link';
import { DataTable, FilterBar, PageHeader, StateBlock } from '@/components/business/page-blocks';
import { queryKeys } from '@/features/shared/query-keys';
import { familyService } from '@/services/families-service';

export default function FamiliesPage() {
  const result = familyService.query({ pageNo: 1, pageSize: 20, keyword: '', status: '正常', sortBy: 'updatedAt', sortOrder: 'desc' });

  return (
    <div className="stack">
      <PageHeader
        title="家庭列表页骨架"
        description={`P06 已预埋家庭维度列表、筛选、导出和行操作入口。query key: ${JSON.stringify(queryKeys.families({ pageNo: 1, pageSize: 20, status: '正常' }))}`}
        actions={<><button className="btn primary">新建家庭</button><button className="btn">导出</button><Link className="btn" href="/families/F-301">打开详情骨架</Link></>}
      />
      <FilterBar fields={[{ label: '关键词', value: '家庭名 / 联系人 / 电话' }, { label: '校区', value: '全部校区', kind: 'select' }, { label: '状态', value: '正常', kind: 'select' }, { label: '未收余额', value: '全部', kind: 'select' }, { label: '待办任务', value: '全部', kind: 'select' }]} />
      <DataTable
        title="家庭列表"
        columns={['家庭编码', '家庭名称', '主联系人', '电话', '关联学生数', '未收余额', '最近沟通时间', '状态']}
        rows={result.list.map((item) => [item.id, item.name, item.contact, item.phone, item.students, item.balance, item.lastContact, item.status])}
      />
      <StateBlock state="loading" title="家庭列表加载" />
    </div>
  );
}
