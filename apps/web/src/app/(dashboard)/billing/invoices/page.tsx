import { DataTable, FilterBar, PageHeader, SummaryPanel, TabStrip } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { billingPermissions, billingTabs } from '@/features/billing/constants';
import { queryKeys } from '@/features/shared/query-keys';
import type { PageResult } from '@/lib/api-client';
import { requireCurrentUser } from '@/lib/current-user';
import { serverApiRequest } from '@/lib/server-api';
import { billingService } from '@/services/billing-service';
import { createBillingInvoice, createInvoicePayment, createInvoiceRefund } from './actions';

export default async function BillingInvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ invoice?: string; payment?: string; paymentStatus?: string; paymentReplayed?: string; refund?: string; refundStatus?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const allowed = hasPermission(currentUser.permissions, billingPermissions.invoicesView);
  const filters = { pageNo: 1, pageSize: 20, status: 'all', tab: 'invoices' as const, sortBy: 'dueDate', sortOrder: 'asc' as const };
  const [result, contracts, products, families, students, paymentDetail, refundDetail] = await Promise.all([
    billingService.queryInvoices(filters),
    billingService.queryContracts({ pageNo: 1, pageSize: 50, status: 'all' }),
    billingService.queryProducts({ pageNo: 1, pageSize: 50, status: 'active' }),
    serverApiRequest<PageResult<{ id: string; familyName?: string | null; primaryContactName?: string | null; familyCode: string }>>('/families?pageNo=1&pageSize=50').catch(() => ({ list: [], page: { pageNo: 1, pageSize: 50, total: 0 } })),
    serverApiRequest<PageResult<{ id: string; name: string; studentNo: string }>>('/students?pageNo=1&pageSize=50').catch(() => ({ list: [], page: { pageNo: 1, pageSize: 50, total: 0 } })),
    query?.payment ? billingService.detailPayment(query.payment).catch(() => null) : Promise.resolve(null),
    query?.refund ? billingService.detailRefund(query.refund).catch(() => null) : Promise.resolve(null),
  ]);
  const action = billingService.actionInvoice(result.invoices.list[0]?.invoiceNo ?? 'INV-202603-201');

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="账单与支付" permissionCode={billingPermissions.invoicesView} />}>
      <div className="stack">
        <PageHeader
          title="账单 / 支付 / 退款"
          description="账单开具、收款记录与退费管理"
          actions={<><a className="btn primary" href="#invoice-create-form">新建账单</a><a className="btn" href="#payment-create-form">记录支付</a><a className="btn" href="#refund-create-form">发起退款</a><button className="btn">添加调整</button></>}
        />
        {query?.invoice ? <section className="panel"><div className="badge success">账单已创建：{query.invoice}</div></section> : null}
        {query?.payment ? <section className="panel"><div className="badge success">{query.paymentReplayed === '1' ? '幂等重放成功' : '支付已记录'}：{query.payment}{query.paymentStatus ? ` / status=${query.paymentStatus}` : ''}</div></section> : null}
        {query?.refund ? <section className="panel"><div className="badge success">退款已创建：{query.refund}{query.refundStatus ? ` / status=${query.refundStatus}` : ''}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
        {/* 欠费预警区域 */}
        {(() => {
          const overdueInvoices = result.invoices.list.filter((item) => {
            const status = (item.status as string).toLowerCase();
            return status === 'overdue' || status === 'issued';
          });
          if (!overdueInvoices.length) return null;
          const totalOverdue = overdueInvoices.reduce((sum, item) => {
            const paid = parseFloat(String(item.paidYuan)) || 0;
            const receivable = parseFloat(String(item.receivableYuan)) || 0;
            return sum + Math.max(receivable - paid, 0);
          }, 0);
          return (
            <section className="panel" style={{ borderColor: 'var(--color-danger, #e74c3c)', borderLeft: '4px solid var(--color-danger, #e74c3c)' }}>
              <h3 style={{ color: 'var(--color-danger, #e74c3c)', margin: '0 0 8px' }}>⚠️ 欠费预警</h3>
              <p>当前有 <strong>{overdueInvoices.length}</strong> 笔未缴清账单，合计欠费金额 <strong>¥{totalOverdue.toFixed(2)}</strong></p>
              <div className="subtle" style={{ marginTop: 8 }}>请及时跟进催缴，避免账单长期逾期。</div>
            </section>
          );
        })()}
        <section className="panel stack" id="invoice-create-form">
          <div className="page-header">
            <div>
              <h3>新建账单</h3>
              <p>为学生创建账单并添加收费项目。</p>
            </div>
          </div>
          <form className="form-grid" action={createBillingInvoice}>
            <div className="field"><label>账单编号</label><input className="input" name="invoiceNo" placeholder="INV-202603-001" required /></div>
            <div className="field"><label>关联合同（可选）</label><select className="select" name="contractId" defaultValue=""><option value="">不关联合同</option>{contracts.list.map((contract) => <option key={contract.contractId} value={contract.contractId}>{contract.contractNo} / {contract.familyName} / {contract.studentName}</option>)}</select></div>
            <div className="field"><label>家庭</label><select className="select" name="familyId" defaultValue={families.list[0]?.id ?? ''} required>{families.list.length ? families.list.map((family) => <option key={family.id} value={family.id}>{family.familyName ?? family.primaryContactName ?? family.familyCode}</option>) : <option value="">暂无家庭</option>}</select></div>
            <div className="field"><label>学生</label><select className="select" name="studentId" defaultValue={students.list[0]?.id ?? ''} required>{students.list.length ? students.list.map((student) => <option key={student.id} value={student.id}>{student.name} / {student.studentNo}</option>) : <option value="">暂无学生</option>}</select></div>
            <div className="field"><label>账期</label><input className="input" name="billingPeriod" placeholder="2026-03" required /></div>
            <div className="field"><label>状态</label><select className="select" name="status" defaultValue="issued"><option value="draft">草稿</option><option value="issued">已开具</option><option value="paid">已缴费</option></select></div>
            <div className="field"><label>开票日期</label><input className="input" type="date" name="issueDate" required /></div>
            <div className="field"><label>到期日期</label><input className="input" type="date" name="dueDate" required /></div>
            <div className="field"><label>应收金额（元）</label><input className="input" type="number" min="0" step="0.01" name="amount" required /></div>
            <div className="field"><label>账单项产品（可选）</label><select className="select" name="productId" defaultValue=""><option value="">自定义账单项</option>{products.list.map((product) => <option key={product.productId} value={product.productId}>{product.name} / {product.productCode}</option>)}</select></div>
            <div className="field"><label>账单项名称</label><input className="input" name="itemName" placeholder="3 月学费" /></div>
            <div className="field"><label>数量</label><input className="input" type="number" min="1" name="quantity" defaultValue="1" /></div>
            <div className="field"><label>单价（元）</label><input className="input" type="number" min="0" step="0.01" name="unitPrice" defaultValue="0" /></div>
            <div className="field"><label>账单项金额（元）</label><input className="input" type="number" min="0" step="0.01" name="itemAmount" defaultValue="0" /></div>
            <div className="field form-span-2"><label>账单备注</label><textarea className="textarea" name="note" placeholder="开票备注、分期说明、财务备注等" /></div>
            <div className="field form-span-2"><label>账单项备注</label><textarea className="textarea" name="itemRemark" placeholder="该条账单项的明细说明" /></div>
            <div className="button-row form-span-2"><button className="btn primary" type="submit">创建账单</button></div>
          </form>
        </section>
        <section className="panel stack" id="payment-create-form">
          <div className="page-header">
            <div>
              <h3>记录收款</h3>
              <p>为账单记录收款信息。</p>
            </div>
          </div>
          <form className="form-grid" action={createInvoicePayment}>
            <div className="field form-span-2"><label>账单</label><select className="select" name="invoiceId" required defaultValue=""><option value="" disabled>请选择账单</option>{result.invoices.list.map((invoice) => <option key={invoice.invoiceId} value={invoice.invoiceId}>{invoice.invoiceNo} / {invoice.familyName} / {invoice.receivableYuan}</option>)}</select></div>
            <div className="field"><label>支付编号</label><input className="input" name="paymentNo" placeholder="PAY-202603-001" required /></div>
            <div className="field"><label>支付金额（元）</label><input className="input" type="number" min="0" step="0.01" name="paidAmount" required /></div>
            <div className="field"><label>支付时间</label><input className="input" type="datetime-local" name="paymentTime" required /></div>
            <div className="field"><label>支付渠道</label><select className="select" name="channel" defaultValue="wechat_pay"><option value="wechat_pay">微信支付</option><option value="alipay">支付宝</option><option value="bank_transfer">银行转账</option><option value="cash">现金</option></select></div>
            <div className="field"><label>状态</label><select className="select" name="status" defaultValue="success"><option value="success">成功</option><option value="failed">失败</option><option value="canceled">已取消</option></select></div>
            <div className="field"><label>交易流水号</label><input className="input" name="transactionNo" placeholder="wx_20260325_xxx" /></div>
            <div className="field form-span-2"><label>备注</label><textarea className="textarea" name="remark" placeholder="收款说明、分次支付备注等" /></div>
            <div className="button-row form-span-2"><button className="btn primary" type="submit" disabled={!result.invoices.list.length}>记录收款</button></div>
          </form>
        </section>
        <section className="panel stack" id="refund-create-form">
          <div className="page-header">
            <div>
              <h3>发起退款</h3>
              <p>基于已有支付记录发起退款申请。</p>
            </div>
          </div>
          {paymentDetail ? (
            <>
              <SummaryPanel title="当前支付详情" items={[
                { name: '支付单', detail: `${paymentDetail.payment.paymentNo} / ${paymentDetail.payment.status}` },
                { name: '关联账单', detail: `${paymentDetail.invoice.invoiceNo} / ${paymentDetail.invoice.status}` },
                { name: '已有关联退款', detail: paymentDetail.refunds.length ? paymentDetail.refunds.map((refund) => `${refund.refundNo} / ¥${(refund.refundAmountCents / 100).toFixed(2)} / ${refund.status}`).join(' / ') : '暂无退款记录' },
              ]} />
              <form className="form-grid" action={createInvoiceRefund}>
                <input type="hidden" name="paymentId" value={paymentDetail.payment.id} />
                <div className="field"><label>退款编号</label><input className="input" name="refundNo" placeholder="RF-202603-001" required /></div>
                <div className="field"><label>退款金额（元）</label><input className="input" type="number" min="0" step="0.01" name="refundAmount" required /></div>
                <div className="field"><label>退款时间</label><input className="input" type="datetime-local" name="refundTime" required /></div>
                <div className="field"><label>状态</label><select className="select" name="status" defaultValue="pending"><option value="pending">待处理</option><option value="completed">已完成</option><option value="rejected">已驳回</option></select></div>
                <div className="field form-span-2"><label>退款原因</label><textarea className="textarea" name="reason" placeholder="退费原因、班型调整说明、结转备注等" required /></div>
                <div className="button-row form-span-2"><button className="btn primary" type="submit">发起退款</button></div>
              </form>
            </>
          ) : (
            <SummaryPanel title="当前退款入口状态" items={[{ name: '需要支付详情', detail: '请先通过本页"记录收款"创建一笔支付记录，即可在此发起退款。' }]} />
          )}
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
        <SummaryPanel title="调整项" items={[
          ...result.adjustments,
          refundDetail ? { name: '最近退款详情', detail: `${refundDetail.refund.refundNo} / ${refundDetail.refund.status} / ${refundDetail.invoice?.invoiceNo ?? '未关联账单'}` } : null,
        ].filter((item): item is NonNullable<typeof item> => Boolean(item)).map((item) => ({ name: 'name' in item ? item.name : item.title, detail: item.detail }))} />
      </div>
    </PermissionGuard>
  );
}
