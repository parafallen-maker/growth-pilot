import Link from 'next/link';
import { DataTable, FilterBar, PageHeader, PaginationBar } from '@/components/business/page-blocks';
import { EmptyState } from '@/components/ui/empty-state';
import { SubmitButton } from '@/components/business/submit-button';
import { CsvExportButton } from '../_components/csv-export-button';
import { QueryStatusToast } from '../_components/query-status-toast';
import { familyService } from '@/services/families-service';
import { createFamily } from './actions';

export default async function FamiliesPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; error?: string }>;
}) {
  const query = await searchParams;
  const filters = { pageNo: 1, pageSize: 20, keyword: '', status: 'active', sortBy: 'updatedAt', sortOrder: 'desc' } as const;
  const result = await familyService.query(filters);

  return (
    <div className="stack">
      <QueryStatusToast successKeys={['created']} />
      <PageHeader
        title="家庭列表"
        description="家庭档案与联系人管理"
        actions={
          <>
            <a className="btn primary" href="#new-family-form">新建家庭</a>
            <CsvExportButton filename="families.csv" headers={['家庭编码', '家庭名称', '主联系人', '电话', '关联学生数', '未收余额', '最近沟通时间', '状态']} rows={result.list.map((item) => [item.code, item.name, item.contact, item.phone, item.students, item.balance, item.lastContact, item.status])} />
            {result.list[0] ? <Link className="btn" href={`/families/${result.list[0].id}`}>打开首个家庭详情</Link> : null}
          </>
        }
      />
      {query?.created ? <section className="panel"><div className="badge success">家庭已创建：{query.created}</div></section> : null}
      {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}

      <section className="panel stack" id="new-family-form">
        <div className="page-header">
          <div>
            <h3>新建家庭</h3>
          </div>
        </div>
        <form className="form-grid" action={createFamily}>
          <div className="field"><label>家庭编号（可选）</label><input className="input" name="familyCode" placeholder="F202603-001" /></div>
          <div className="field"><label>家庭名称</label><input className="input" name="familyName" placeholder="例如：张三家庭" required /></div>
          <div className="field"><label>主联系人</label><input className="input" name="primaryContactName" placeholder="家长姓名" required /></div>
          <div className="field"><label>主联系人电话</label><input className="input" name="primaryMobile" placeholder="13800000000" /></div>
          <div className="field"><label>次联系人电话（可选）</label><input className="input" name="secondaryMobile" placeholder="13900000000" /></div>
          <div className="field"><label>家庭结构（可选）</label><input className="input" name="familyStructure" placeholder="双亲 / 单亲 / 祖辈监护" /></div>
          <div className="field form-span-2"><label>地址（可选）</label><input className="input" name="address" placeholder="家庭住址或常用联系地址" /></div>
          <div className="field"><label>沟通偏好（可选）</label><input className="input" name="communicationPreference" placeholder="电话 / 微信 / 线下" /></div>
          <div className="field form-span-2"><label>备注（可选）</label><textarea className="textarea" name="notes" placeholder="补充家庭情况、沟通注意事项等" /></div>
          <div className="button-row form-span-2"><SubmitButton pendingLabel="创建中...">提交创建</SubmitButton><button className="btn" type="reset">清空</button></div>
        </form>
      </section>

      {result.list.length === 0 && <EmptyState icon="🏠" title="暂无家庭数据" description="当前没有家庭档案记录。" actionLabel="新建家庭" actionHref="#new-family-form" />}
      <FilterBar fields={[{ label: '关键词', value: '家庭名 / 联系人 / 电话' }, { label: '校区', value: '全部校区', kind: 'select' }, { label: '状态', value: '正常', kind: 'select' }, { label: '未收余额', value: '全部', kind: 'select' }, { label: '待办任务', value: '全部', kind: 'select' }]} />
      <DataTable
        title={`家庭列表（共 ${result.page.total} 条）`}
        columns={['家庭编码', '家庭名称', '主联系人', '电话', '关联学生数', '未收余额', '最近沟通时间', '状态']}
        rows={result.list.map((item) => [item.code, item.name, item.contact, item.phone, item.students, item.balance, item.lastContact, item.status])}
        emptyLabel="当前筛选下暂无家庭档案。"
      />
      <PaginationBar pageNo={result.page.pageNo} pageSize={result.page.pageSize} total={result.page.total} baseUrl="/families" />
    </div>
  );
}
