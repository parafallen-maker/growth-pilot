import { DataTable, FilterBar, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { billingPermissions } from '@/features/billing/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { mockCurrentUser } from '@/lib/navigation';
import { billingService } from '@/services/billing-service';

export default function BillingContractsPage() {
  const allowed = hasPermission(mockCurrentUser.permissions, billingPermissions.contractsView);
  const filters = { pageNo: 1, pageSize: 20, status: 'active', campusId: 'campus-guiyang', termId: '2026-spring', sortBy: 'expiryDate', sortOrder: 'asc' as const };
  const result = billingService.queryContracts(filters);
  const detail = billingService.detailContract(result.list[0]?.contractNo ?? 'CT-202603-001');

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="合同列表" permissionCode={billingPermissions.contractsView} />}>
      <div className="stack">
        <PageHeader
          title="合同列表骨架"
          description={`P21 已铺 family/student 统一过滤器、列表 + 详情侧栏骨架。query key: ${JSON.stringify(queryKeys.billingContracts(filters))}`}
          actions={<><button className="btn primary">新建合同</button><button className="btn">创建账单</button><button className="btn">创建续费任务</button></>}
        />
        <FilterBar fields={[
          { label: '家庭筛选', value: '统一 family filter 占位', kind: 'select' },
          { label: '学生筛选', value: '统一 student filter 占位', kind: 'select' },
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
              <div><h3>合同详情抽屉 / 占位</h3><p>后续切 client drawer 或 tabs 即可，不改服务分层。</p></div>
              <span className="badge">drawer skeleton</span>
            </div>
            <SummaryPanel title="合同摘要" items={detail.summary} />
            <SummaryPanel title="动作位" items={detail.actions} />
          </aside>
        </div>
      </div>
    </PermissionGuard>
  );
}
