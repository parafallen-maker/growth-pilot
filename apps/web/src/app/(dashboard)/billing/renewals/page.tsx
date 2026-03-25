import { DataTable, FilterBar, PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { billingPermissions } from '@/features/billing/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { billingService } from '@/services/billing-service';

export default async function BillingRenewalsPage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, billingPermissions.renewalsView);
  const filters = { pageNo: 1, pageSize: 20, status: 'all', sortBy: 'contractExpiryDate', sortOrder: 'asc' as const };
  const result = await billingService.queryRenewals(filters);

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="续费跟进" permissionCode={billingPermissions.renewalsView} />}>
      <div className="stack">
        <PageHeader
          title="续费跟进"
          description={`当前展示 billing/renewals 真实数据，包含续费池与跟进时间线。query key: ${JSON.stringify(queryKeys.billingRenewals(filters))}`}
          actions={<><button className="btn primary">更新跟进状态</button><button className="btn">新建沟通记录</button><button className="btn">转创建账单</button></>}
        />
        <FilterBar fields={[
          { label: '家庭', value: '全部家庭', kind: 'select' },
          { label: '学生', value: '全部学生', kind: 'select' },
          { label: '关键词', value: '家庭 / 学生 / 负责人' },
          { label: '状态', value: '全部状态', kind: 'select' },
          { label: '负责人', value: '全部负责人（真实 owner 已解析展示）', kind: 'select' },
        ]} />
        <div className="grid-billing-layout">
          <DataTable title="续费跟进池" columns={['家庭', '学生', '合同到期日', '当前状态', '负责人', '下次跟进时间', '动作']} rows={result.list.map((item) => [item.familyName, item.studentName, item.contractExpiryDate, item.status, item.owner, item.nextFollowUpAt, item.actions])} />
          <div className="stack">
            <TimelinePanel title="跟进时间线" items={result.list.map((item) => ({ title: `${item.studentName} · ${item.status}`, detail: `${item.owner} · 下次跟进 ${item.nextFollowUpAt}` }))} />
            <SummaryPanel title="页面说明" items={[{ name: '无数据时', detail: '若当前没有临期合同，保留时间线区域与筛选项，并明确展示空结果。' }]} />
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
