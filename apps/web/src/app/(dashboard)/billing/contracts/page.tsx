import { DataTable, FilterBar, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { billingPermissions } from '@/features/billing/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { billingService } from '@/services/billing-service';

export default async function BillingContractsPage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, billingPermissions.contractsView);
  const filters = { pageNo: 1, pageSize: 20, status: 'active', campusId: 'campus-guiyang', termId: '2026-spring', sortBy: 'expiryDate', sortOrder: 'asc' as const };
  const result = await billingService.queryContracts(filters);
  const detail = await billingService.detailContract(result.list[0]?.contractId ?? 'contract-001');

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="合同列表" permissionCode={billingPermissions.contractsView} />}>
      <div className="stack">
        <PageHeader
          title="合同列表"
          description={`P21 已切到 billing/contracts + billing/contracts/{id} 真接口。query key: ${JSON.stringify(queryKeys.billingContracts(filters))}`}
          actions={<><button className="btn primary">新建合同</button><button className="btn">创建账单</button><button className="btn">创建续费任务</button></>}
        />
        <FilterBar fields={[
          { label: '家庭筛选', value: '待补统一 family filter', kind: 'select' },
          { label: '学生筛选', value: '待补统一 student filter', kind: 'select' },
          { label: '关键词', value: '合同编号 / 家庭 / 学生' },
          { label: '状态', value: '全部状态', kind: 'select' },
          { label: '校区', value: '贵阳主校区', kind: 'select' },
          { label: '学期', value: '2026 春季', kind: 'select' },
          { label: '到期开始', value: '2026-03-24' },
          { label: '到期结束', value: '2026-06-30' },
        ]} />
        <div className="grid-billing-layout">
          <DataTable title="合同列表" columns={['合同编号', '家庭', '学生', '生效时间', '到期时间', '合同金额（元）', '状态', '行动作']} rows={result.list.map((item) => [item.contractNo, item.familyName, item.studentName, item.effectiveDate, item.expiryDate, item.contractAmountYuan, item.status, item.actions])} />
          <aside className="panel stack">
            <div className="page-header">
              <div><h3>合同详情侧栏</h3><p>当前直接读取合同详情接口；后续如切 client drawer 或 tabs，不动 service 分层。</p></div>
              <span className="badge">contract detail</span>
            </div>
            <SummaryPanel title="合同摘要" items={detail.summary} />
            <SummaryPanel title="动作位" items={detail.actions} />
          </aside>
        </div>
      </div>
    </PermissionGuard>
  );
}
