import { DataTable, FilterBar, PageHeader, SummaryPanel, TabStrip } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { billingPermissions, billingTabs } from '@/features/billing/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { mockCurrentUser } from '@/lib/navigation';
import { billingService } from '@/services/billing-service';

export default function BillingInvoicesPage() {
  const allowed = hasPermission(mockCurrentUser.permissions, billingPermissions.invoicesView);
  const filters = { pageNo: 1, pageSize: 20, status: 'all', tab: 'invoices' as const, sortBy: 'dueDate', sortOrder: 'asc' as const };
  const result = billingService.queryInvoices(filters);
  const action = billingService.actionInvoice(result.invoices.list[0]?.invoiceNo ?? 'INV-202603-201');

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="账单与支付" permissionCode={billingPermissions.invoicesView} />}>
      <div className="stack">
        <PageHeader
          title="账单 / 支付 / 退款骨架"
          description={`P22 已铺统一 family/student 过滤器、标签页骨架、金额元展示和动作位。query key: ${JSON.stringify(queryKeys.billingInvoices(filters))}`}
          actions={<><button className="btn primary">新建账单</button><button className="btn">记录支付</button><button className="btn">发起退款</button><button className="btn">添加调整</button></>}
        />
        <FilterBar fields={[
          { label: '家庭筛选', value: '统一 family filter 占位', kind: 'select' },
          { label: '学生筛选', value: '统一 student filter 占位', kind: 'select' },
          { label: '关键词', value: '账单编号 / 支付编号' },
          { label: '状态', value: '全部状态', kind: 'select' },
          { label: '截止开始', value: '2026-03-01' },
          { label: '截止结束', value: '2026-03-31' },
        ]} />
        <section className="panel stack">
          <TabStrip tabs={[...billingTabs]} active="账单" />
          <DataTable title="账单列表" columns={['账单编号', '家庭', '学生', '应收（元）', '截止日', '已收（元）', '状态', '动作']} rows={result.invoices.list.map((item) => [item.invoiceNo, item.familyName, item.studentName, item.receivableYuan, item.dueDate, item.paidYuan, item.status, item.actions])} />
        </section>
        <div className="grid-2">
          <DataTable title="支付列表" columns={['支付编号', '账单编号', '家庭', '学生', '支付金额（元）', '支付时间', '渠道', '动作']} rows={result.payments.list.map((item) => [item.paymentNo, item.invoiceNo, item.familyName, item.studentName, item.paidYuan, item.paidAt, item.channel, item.actions])} />
          <DataTable title="退款列表" columns={['退款编号', '支付编号', '家庭', '学生', '退款金额（元）', '退款时间', '状态', '动作']} rows={result.refunds.list.map((item) => [item.refundNo, item.paymentNo, item.familyName, item.studentName, item.refundYuan, item.refundAt, item.status, item.actions])} />
        </div>
        <SummaryPanel title="调整项 + 动作状态" items={[
          ...result.adjustments,
          { name: '统一动作位', detail: action.actions.join(' / ') },
          { name: '状态流', detail: action.statusFlow },
        ].map((item) => ({ name: 'name' in item ? item.name : item.title, detail: item.detail }))} />
      </div>
    </PermissionGuard>
  );
}
