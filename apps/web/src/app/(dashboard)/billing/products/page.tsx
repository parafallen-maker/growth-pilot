import { DataTable, FilterBar, MetricGrid, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { billingPermissions } from '@/features/billing/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { billingService } from '@/services/billing-service';
import { createBillingProduct } from './actions';

export default async function BillingProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const allowed = hasPermission(currentUser.permissions, billingPermissions.productsView);
  const filters = { pageNo: 1, pageSize: 20, status: 'active', sortBy: 'updatedAt', sortOrder: 'desc' as const };
  const result = await billingService.queryProducts(filters);

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="收费产品" permissionCode={billingPermissions.productsView} />}>
      <div className="stack">
        <PageHeader
          title="收费产品"
          description={`当前展示 billing/products 真实数据，金额统一按元展示。query key: ${JSON.stringify(queryKeys.billingProducts(filters))}`}
          actions={<><a className="btn primary" href="#billing-product-create-form">新建产品</a><button className="btn">编辑</button><button className="btn">停用</button></>}
        />
        {query?.created ? <section className="panel"><div className="badge success">收费产品已创建：{query.created}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
        <MetricGrid items={[
          { label: '启用产品', value: String(result.list.filter((item) => item.status === 'active').length), hint: '当前页真实 active SKU' },
          { label: '当前页产品数', value: String(result.list.length), hint: 'billing/products 当前返回记录' },
          { label: '计费模式数', value: String(new Set(result.list.map((item) => item.billingMode)).size), hint: '按当前页去重统计' },
          { label: '金额口径', value: '元', hint: 'VO 层统一由 cents 转元' },
        ]} />
        <section className="panel stack" id="billing-product-create-form">
          <div className="page-header">
            <div>
              <h3>新建收费产品</h3>
              <p>当前表单直连 POST /billing/products，产品列表提交后立即回流到同页。</p>
            </div>
            <span className="badge success">POST /billing/products</span>
          </div>
          <form className="form-grid" action={createBillingProduct}>
            <div className="field"><label>产品编码</label><input className="input" name="code" placeholder="PRD-202603-001" required /></div>
            <div className="field"><label>产品名称</label><input className="input" name="name" placeholder="春季课程包" required /></div>
            <div className="field"><label>产品分类</label><input className="input" name="category" defaultValue="course" required /></div>
            <div className="field"><label>计费模式</label><select className="select" name="billingMode" defaultValue="term"><option value="term">term</option><option value="monthly">monthly</option><option value="once">once</option></select></div>
            <div className="field"><label>单价（元）</label><input className="input" type="number" min="0" step="0.01" name="price" required /></div>
            <div className="field"><label>计量单位</label><input className="input" name="unit" defaultValue="term" /></div>
            <div className="field"><label>状态</label><select className="select" name="status" defaultValue="active"><option value="active">active</option><option value="inactive">inactive</option></select></div>
            <div className="field form-span-2"><label>描述</label><textarea className="textarea" name="description" placeholder="适用学段、收费说明、开票备注等" /></div>
            <div className="button-row form-span-2"><button className="btn primary" type="submit">创建产品</button></div>
          </form>
        </section>
        <FilterBar fields={[
          { label: '家庭维度', value: '全部家庭', kind: 'select' },
          { label: '学生维度', value: '全部学生', kind: 'select' },
          { label: '关键词', value: '产品编码 / 名称' },
          { label: '状态', value: '启用中', kind: 'select' },
          { label: '计费模式', value: '全部模式', kind: 'select' },
        ]} />
        <DataTable title="产品列表" columns={['产品编码', '名称', '计费模式', '单价（元）', '状态', '动作']} rows={result.list.map((item) => [item.productCode, item.name, item.billingMode, item.unitPriceYuan, item.status, '编辑 / 停用'])} />
        <SummaryPanel title="页面说明" items={[{ name: '数据展示', detail: '当前页直接消费真实产品列表；无数据时保留表头和筛选项。' }]} />
      </div>
    </PermissionGuard>
  );
}
