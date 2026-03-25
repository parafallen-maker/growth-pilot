import { DataTable, FilterBar, PageHeader, SummaryPanel, TabStrip } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { billingPermissions, billingTabs } from '@/features/billing/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { billingService } from '@/services/billing-service';
import { createInvoicePayment } from './actions';

export default async function BillingInvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ paid?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const allowed = hasPermission(currentUser.permissions, billingPermissions.invoicesView);
  const filters = { pageNo: 1, pageSize: 20, status: 'all', tab: 'invoices' as const, sortBy: 'dueDate', sortOrder: 'asc' as const };
  const result = await billingService.queryInvoices(filters);
  const action = billingService.actionInvoice(result.invoices.list[0]?.invoiceNo ?? 'INV-202603-201');

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="账单与支付" permissionCode={billingPermissions.invoicesView} />}>
      <div className="stack">
        <PageHeader
          title="账单 / 支付 / 退款"
          description={`当前展示 billing/invoices 真实数据；payment/refund 列表仍受后端接口缺口限制。query key: ${JSON.stringify(queryKeys.billingInvoices(filters))}`}
          actions={<><button className="btn primary">新建账单</button><a className="btn" href="#payment-create-form">记录支付</a><button className="btn">发起退款</button><button className="btn">添加调整</button></>}
        />
        {query?.paid ? <section className="panel"><div className="badge success">支付已记录：{query.paid}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
        <section className="panel stack" id="payment-create-form">
          <div className="page-header">
            <div>
              <h3>记录收款</h3>
              <p>表单已接入 POST /billing/invoices/{'{id}'}/payments。当前后端只开放创建与详情，支付列表聚合尚未开放。</p>
            </div>
            <span className="badge success">POST /payments</span>
          </div>
          <form className="form-grid" action={createInvoicePayment}>
            <div className="field form-span-2"><label>账单</label><select className="select" name="invoiceId" required defaultValue="">{result.invoices.list.map((invoice) => <option key={invoice.invoiceId} value={invoice.invoiceId}>{invoice.invoiceNo} / {invoice.familyName} / {invoice.receivableYuan}</option>)}</select></div>
            <div className="field"><label>支付编号</label><input className="input" name="paymentNo" placeholder="PAY-202603-001" required /></div>
            <div className="field"><label>支付金额（元）</label><input className="input" type="number" min="0" step="0.01" name="paidAmount" required /></div>
            <div className="field"><label>支付时间</label><input className="input" type="datetime-local" name="paymentTime" required /></div>
            <div className="field"><label>支付渠道</label><select className="select" name="channel" defaultValue="wechat_pay"><option value="wechat_pay">wechat_pay</option><option value="alipay">alipay</option><option value="bank_transfer">bank_transfer</option><option value="cash">cash</option></select></div>
            <div className="field"><label>状态</label><select className="select" name="status" defaultValue="success"><option value="success">success</option><option value="pending">pending</option><option value="failed">failed</option></select></div>
            <div className="field"><label>交易流水号</label><input className="input" name="transactionNo" placeholder="wx_20260325_xxx" /></div>
            <div className="field form-span-2"><label>备注</label><textarea className="textarea" name="remark" placeholder="收款说明、分次支付备注等" /></div>
            <div className="button-row form-span-2"><button className="btn primary" type="submit">记录收款</button></div>
          </form>
        </section>
        <FilterBar fields={[
          { label: '家庭', value: '全部家庭', kind: 'select' },
          { label: '学生', value: '全部学生', kind: 'select' },
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
