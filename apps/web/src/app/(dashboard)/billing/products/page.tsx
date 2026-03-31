import { DataTable, FilterBar, MetricGrid, PageHeader, PaginationBar, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { billingPermissions } from '@/features/billing/constants';
import { requireCurrentUser } from '@/lib/current-user';
import { billingService } from '@/services/billing-service';
import { createBillingProduct } from './actions';
import { SubmitButton } from '@/components/business/submit-button';
import { CsvExportButton } from '../../_components/csv-export-button';
import { QueryStatusToast } from '../../_components/query-status-toast';

export default async function BillingProductsPage({ searchParams }: { searchParams?: Promise<{ created?: string; error?: string }> }) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const allowed = hasPermission(currentUser.permissions, billingPermissions.productsView);
  const filters = { pageNo: 1, pageSize: 20, status: 'active', sortBy: 'updatedAt', sortOrder: 'desc' as const };
  const result = await billingService.queryProducts(filters);

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="收费产品" permissionCode={billingPermissions.productsView} />}>
      <div className="stack">
        <QueryStatusToast successKeys={['created']} />
        <PageHeader title="收费产品" description="收费方案与收费项目管理" actions={<><a className="btn primary" href="#billing-product-create-form">新建产品</a><button className="btn">编辑</button><CsvExportButton filename="billing-products.csv" headers={['产品编码', '名称', '计费模式', '单价（元）', '状态']} rows={result.list.map((item) => [item.productCode, item.name, item.billingMode, item.unitPriceYuan, item.status])} /></>} />
        {query?.created ? <section className="panel"><div className="badge success">收费产品已创建：{query.created}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
        <MetricGrid items={[{ label: '启用产品', value: String(result.list.filter((item) => item.status === 'active').length) }, { label: '当前页产品数', value: String(result.list.length) }, { label: '计费模式数', value: String(new Set(result.list.map((item) => item.billingMode)).size) }]} />
        <section className="panel stack" id="billing-product-create-form"><div className="page-header"><div><h3>新建收费产品</h3></div></div><form className="form-grid" action={createBillingProduct}><div className="field"><label>产品编码</label><input className="input" name="code" placeholder="PRD-202603-001" required /></div><div className="field"><label>产品名称</label><input className="input" name="name" placeholder="春季课程包" required /></div><div className="field"><label>产品分类</label><input className="input" name="category" defaultValue="course" required /></div><div className="field"><label>计费模式</label><select className="select" name="billingMode" defaultValue="term"><option value="term">term</option><option value="monthly">monthly</option><option value="once">once</option></select></div><div className="field"><label>单价（元）</label><input className="input" type="number" min="0" step="0.01" name="price" required /></div><div className="field"><label>计量单位</label><input className="input" name="unit" defaultValue="term" /></div><div className="field"><label>状态</label><select className="select" name="status" defaultValue="active"><option value="active">active</option><option value="inactive">inactive</option></select></div><div className="field form-span-2"><label>描述</label><textarea className="textarea" name="description" placeholder="适用学段、收费说明、开票备注等" /></div><div className="button-row form-span-2"><SubmitButton pendingLabel="创建中...">创建产品</SubmitButton></div></form></section>
        <FilterBar fields={[{ label: '家庭维度', value: '全部家庭', kind: 'select' }, { label: '学生维度', value: '全部学生', kind: 'select' }, { label: '关键词', value: '产品编码 / 名称' }, { label: '状态', value: '启用中', kind: 'select' }, { label: '计费模式', value: '全部模式', kind: 'select' }]} />
        <DataTable title="产品列表" columns={['产品编码', '名称', '计费模式', '单价（元）', '状态', '动作']} rows={result.list.map((item) => [item.productCode, item.name, item.billingMode, item.unitPriceYuan, item.status, '编辑 / 停用'])} emptyLabel="暂无收费产品。" />
        <PaginationBar pageNo={result.page.pageNo} pageSize={result.page.pageSize} total={result.page.total} baseUrl="/billing/products" />

      </div>
    </PermissionGuard>
  );
}
