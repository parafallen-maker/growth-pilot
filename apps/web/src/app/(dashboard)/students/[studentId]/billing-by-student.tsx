import { SummaryPanel } from '@/components/business/page-blocks';

function currency(amountCents: number) {
  return `¥${(amountCents / 100).toLocaleString('zh-CN')}`;
}

function invoiceStatus(status?: string) {
  switch (status) {
    case 'paid': return '已付';
    case 'unpaid': return '未付';
    case 'overdue': return '逾期';
    case 'partial': return '部分付';
    default: return status ?? '--';
  }
}

type InvoiceItem = { invoiceId: string; invoiceNo: string; familyName: string; studentName: string; receivableYuan: string; dueDate: string; paidYuan: string; status: string; actions: string };

export function BillingByStudentSection({ studentId, studentName, billingData }: { studentId: string; studentName: string; billingData: { invoices: { list: InvoiceItem[]; page: { total: number } } } | null }) {
  if (!billingData) {
    return (
      <SummaryPanel
        title="📋 关联账单"
        items={[{ name: '账单数据', detail: '暂时无法加载该学生的账单信息' }]}
      />
    );
  }

  const invoices = billingData.invoices.list;
  if (!invoices.length) {
    return (
      <SummaryPanel
        title="📋 关联账单"
        items={[{ name: '账单', detail: `该学生暂无关联账单` }]}
      />
    );
  }

  return (
    <div className="stack">
      <h3>📋 关联账单（{billingData.invoices.page.total} 条）</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>账单编号</th>
            <th>应收金额</th>
            <th>已收金额</th>
            <th>到期日</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.invoiceId}>
              <td>{inv.invoiceNo}</td>
              <td>{inv.receivableYuan}</td>
              <td>{inv.paidYuan}</td>
              <td>{inv.dueDate}</td>
              <td>{invoiceStatus(inv.status)}</td>
              <td><a className="btn small" href={`/billing/invoices/${inv.invoiceId}`}>查看</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
