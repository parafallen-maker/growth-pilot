import { DataTable, FilterBar, MetricGrid, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { billingPermissions } from '@/features/billing/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { billingService } from '@/services/billing-service';

export default async function BillingProductsPage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, billingPermissions.productsView);
  const filters = { pageNo: 1, pageSize: 20, status: 'active', sortBy: 'updatedAt', sortOrder: 'desc' as const };
  const result = await billingService.queryProducts(filters);

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="收费产品" permissionCode={billingPermissions.productsView} />}>
      <div className="stack">
        <PageHeader
          title="收费产品"
          description={`当前展示 billing/products 真实数据，金额统一按元展示。query key: ${JSON.stringify(queryKeys.billingProducts(filters))}`}
          actions={<><button className="btn primary">新建产品</button><button className="btn">编辑</button><button className="btn">停用</button></>}
        />
        <MetricGrid items={[
          { label: '启用产品', value: String(result.list.filter((item) => item.status === 'active').length), hint: '当前页真实 active SKU' },
          { label: '当前页产品数', value: String(result.list.length), hint: 'billing/products 当前返回记录' },
          { label: '计费模式数', value: String(new Set(result.list.map((item) => item.billingMode)).size), hint: '按当前页去重统计' },
          { label: '金额口径', value: '元', hint: 'VO 层统一由 cents 转元' },
        ]} />
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
