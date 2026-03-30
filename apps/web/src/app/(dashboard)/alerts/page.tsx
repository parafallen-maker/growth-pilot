import Link from 'next/link';
import { FilterBar, MetricGrid, PageHeader, PaginationBar, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { SubmitButton } from '@/components/business/submit-button';
import { requireCurrentUser } from '@/lib/current-user';
import { alertsService, type AlertQuery } from '@/services/alerts-service';
import { advanceAlert } from './actions';
import {
  ALERT_LEVEL_LABELS as levelLabel,
  ALERT_TYPE_LABELS as typeLabel,
  getPriorityStyle,
} from '@/lib/business-logic';

const statusLabel: Record<string, string> = {
  open: '未处理',
  acknowledged: '已确认',
  resolved: '已解决',
};

function normalizeParam(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : undefined;
}

function alertActionLink(type: string) {
  if (type === 'overdue_payment') return '/billing/invoices';
  if (type === 'academic_risk') return '/homework/submissions';
  if (type === 'absent_streak') return '/attendance/board';
  if (type === 'goal_overdue') return '/growth/goals';
  return null;
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCurrentUser();
  const query = await searchParams;
  const alertQuery: AlertQuery = {
    pageNo: Number(normalizeParam(query?.pageNo) ?? 1) || 1,
    pageSize: Number(normalizeParam(query?.pageSize) ?? 10) || 10,
    keyword: normalizeParam(query?.keyword),
    alertType: normalizeParam(query?.alertType),
    alertLevel: (normalizeParam(query?.alertLevel) as AlertQuery['alertLevel']) ?? 'all',
    status: (normalizeParam(query?.status) as AlertQuery['status']) ?? 'all',
    dateFrom: normalizeParam(query?.dateFrom),
    dateTo: normalizeParam(query?.dateTo),
    sortBy: normalizeParam(query?.sortBy) ?? 'createdAt',
    sortOrder: normalizeParam(query?.sortOrder) === 'asc' ? 'asc' : 'desc',
  };

  const result = await alertsService.query(alertQuery);
  const alerts = result.list;
  const summarySource = await alertsService.query({ pageNo: 1, pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' });
  const openAlerts = summarySource.list.filter((a) => a.status === 'open');
  const resolvedAlerts = summarySource.list.filter((a) => a.status === 'resolved');
  const highCount = openAlerts.filter((a) => a.level === 'high').length;

  return (
    <div className="stack">
      <PageHeader
        title="预警中心"
        description="系统自动检测异常情况并生成预警"
      />

      <MetricGrid items={[
        { label: '未处理预警', value: String(openAlerts.length), hint: '需要跟进' },
        { label: '严重预警', value: String(highCount), hint: '需优先处理' },
        { label: '已处理', value: String(resolvedAlerts.length), hint: '本月已处理' },
        { label: '总量', value: String(summarySource.page.total), hint: '当前预警池' },
      ]} />

      <FilterBar
        baseUrl="/alerts"
        fields={[
          { name: 'keyword', label: '关键词', placeholder: '标题 / 内容 / 处理人' },
          { name: 'alertType', label: '类型', kind: 'select', options: [{ label: '全部类型', value: 'all' }, ...Object.entries(typeLabel).map(([value, label]) => ({ value, label }))] },
          { name: 'alertLevel', label: '级别', kind: 'select', options: [{ label: '全部级别', value: 'all' }, { label: '高', value: 'high' }, { label: '中', value: 'medium' }, { label: '低', value: 'low' }] },
          { name: 'status', label: '状态', kind: 'select', options: [{ label: '全部状态', value: 'all' }, { label: '未处理', value: 'open' }, { label: '已确认', value: 'acknowledged' }, { label: '已解决', value: 'resolved' }] },
          { name: 'dateFrom', label: '起始日期', inputType: 'date' },
          { name: 'dateTo', label: '结束日期', inputType: 'date' },
        ]}
      />

      <section className="panel stack">
        <h3>⚡ 预警列表</h3>
        <div className="summary-list">
          {alerts.map((alert) => {
            const actionLink = alertActionLink(alert.type);
            return (
              <div className="summary-item" key={alert.id} style={{ ...getPriorityStyle(alert.level), paddingLeft: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <strong>{levelLabel[alert.level]} {alert.title}</strong>
                  <span className="badge">{statusLabel[alert.status] ?? alert.status}</span>
                </div>
                <div className="subtle">{typeLabel[alert.type] ?? alert.type} · 触发时间：{alert.triggeredAt}</div>
                <div className="subtle">{alert.detail}</div>
                <div className="button-row" style={{ marginTop: 8 }}>
                  {alert.studentId ? <Link className="btn" href={`/students/${alert.studentId}`}>查看学生</Link> : null}
                  {actionLink ? <Link className="btn" href={actionLink}>关联页面</Link> : null}
                  {alert.status === 'open' ? (
                    <form action={advanceAlert}>
                      <input type="hidden" name="alertId" value={alert.id} />
                      <input type="hidden" name="nextStatus" value="acknowledged" />
                      <SubmitButton pendingLabel="提交中...">确认接收</SubmitButton>
                    </form>
                  ) : null}
                  {alert.status === 'acknowledged' ? (
                    <form action={advanceAlert}>
                      <input type="hidden" name="alertId" value={alert.id} />
                      <input type="hidden" name="nextStatus" value="resolved" />
                      <SubmitButton pendingLabel="提交中...">标记已解决</SubmitButton>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
          {alerts.length === 0 ? <div className="subtle" style={{ padding: 16, textAlign: 'center' }}>当前筛选条件下暂无预警</div> : null}
        </div>
      </section>

      <PaginationBar pageNo={result.page.pageNo} pageSize={result.page.pageSize} total={result.page.total} baseUrl="/alerts" />

      <div className="grid-2">
        <SummaryPanel
          title="预警规则说明"
          items={[
            { name: '欠费预警', detail: '逾期账单会进入财务/班主任跟进视图。' },
            { name: '学业预警', detail: '连续低正确率或待复核积压会进入教学面板。' },
            { name: '缺勤预警', detail: '签到异常会提示前台和班主任联动。' },
            { name: '目标逾期', detail: '成长目标超期未 check-in 会进入跟进队列。' },
          ]}
        />
        <TimelinePanel
          title="✅ 已处理预警"
          items={resolvedAlerts.slice(0, 10).map((alert) => ({
            title: `${typeLabel[alert.type] ?? alert.type}`,
            detail: `${alert.title} · 触发 ${alert.triggeredAt}`,
          }))}
        />
      </div>
    </div>
  );
}
