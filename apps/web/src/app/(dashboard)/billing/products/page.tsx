import { DataTable, FilterBar, MetricGrid, PageHeader, StateBlock } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { billingPermissions } from '@/features/billing/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { getCurrentUser } from '@/lib/current-user';
import { billingService } from '@/services/billing-service';

export default async function BillingProductsPage() {
  const currentUser = await getCurrentUser();
  const allowed = hasPermission(currentUser.permissions, billingPermissions.productsView);
  const filters = { pageNo: 1, pageSize: 20, status: 'active', sortBy: 'updatedAt', sortOrder: 'desc' as const };
  const result = await billingService.queryProducts(filters);

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="收费产品" permissionCode={billingPermissions.productsView} />}>
      <div className="stack">
        <PageHeader
          title="收费产品骨架"
          description={`P20 已铺产品列表、family/student 统一过滤器占位与元金额展示。query key: ${JSON.stringify(queryKeys.billingProducts(filters))}`}
          actions={<><button className="btn primary">新建产品</button><button className="btn">编辑</button><button className="btn">停用</button></>}
        />
        <MetricGrid items={[
          { label: '启用产品', value: '12', hint: 'active SKU / mock' },
          { label: '草稿产品', value: '3', hint: '待财务校对' },
          { label: '按课时产品', value: '7', hint: '后续接真实维度统计' },
          { label: '金额口径', value: '元', hint: 'VO 层统一由 cents 转元' },
        ]} />
        <FilterBar fields={[
          { label: '家庭筛选', value: '统一 family filter 占位', kind: 'select' },
          { label: '学生筛选', value: '统一 student filter 占位', kind: 'select' },
          { label: '关键词', value: '产品编码 / 名称' },
          { label: '状态', value: '启用中', kind: 'select' },
          { label: '计费模式', value: '全部模式', kind: 'select' },
        ]} />
        <DataTable title="产品列表" columns={['产品编码', '名称', '计费模式', '单价（元）', '状态', '动作']} rows={result.list.map((item) => [item.productCode, item.name, item.billingMode, item.unitPriceYuan, item.status, '编辑 / 停用'])} />
        <div className="grid-2"><StateBlock state="loading" title="产品列表 loading" /><StateBlock state="error" title="产品列表 error" /></div>
      </div>
    </PermissionGuard>
  );
}
