import Link from 'next/link';
import { PageHeader, MetricGrid, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { requireCurrentUser } from '@/lib/current-user';

const levelLabel: Record<string, string> = { high: '🔴 严重', medium: '🟡 注意', low: '⚪ 提示' };
const typeLabel: Record<string, string> = {
  overdue_payment: '欠费预警',
  academic_risk: '学业预警',
  absent_streak: '缺勤预警',
  goal_overdue: '目标逾期',
};

// Stub data until backend /alerts endpoint is available
function getStubAlerts() {
  return [
    {
      id: 'a1',
      type: 'overdue_payment',
      level: 'high',
      status: 'open',
      title: '张小明 · 账单 INV-202603-001 逾期 12 天',
      detail: '应收 ¥3,800 · 已收 ¥0',
      studentName: '张小明',
      studentId: 'stub-s1',
      triggeredAt: '2026-03-14',
      rule: '账单逾期 ≥ 7 天自动触发',
    },
    {
      id: 'a2',
      type: 'academic_risk',
      level: 'medium',
      status: 'open',
      title: '李小红 · 数学正确率连续 3 次低于 60%',
      detail: '最近 3 次：52% → 48% → 55%',
      studentName: '李小红',
      studentId: 'stub-s2',
      triggeredAt: '2026-03-24',
      rule: '连续 3 次作业正确率 < 60% 自动触发',
    },
    {
      id: 'a3',
      type: 'absent_streak',
      level: 'medium',
      status: 'open',
      title: '王小华 · 连续 3 个工作日未签到',
      detail: '最后签到：2026-03-21',
      studentName: '王小华',
      studentId: 'stub-s3',
      triggeredAt: '2026-03-25',
      rule: '连续 3 天未签到自动触发',
    },
    {
      id: 'a4',
      type: 'goal_overdue',
      level: 'low',
      status: 'open',
      title: '赵小飞 · 成长目标"课堂主动举手"超期 10 天',
      detail: '目标截止 2026-03-15，至今未 check-in',
      studentName: '赵小飞',
      studentId: 'stub-s4',
      triggeredAt: '2026-03-22',
      rule: '成长目标超期 7 天未跟进自动触发',
    },
    {
      id: 'a5',
      type: 'overdue_payment',
      level: 'high',
      status: 'resolved',
      title: '陈小芳 · 账单 INV-202602-015 逾期 已处理',
      detail: '已收款 ¥2,400 · 2026-03-20 标记处理',
      studentName: '陈小芳',
      studentId: 'stub-s5',
      triggeredAt: '2026-03-10',
      rule: '账单逾期 ≥ 7 天自动触发',
    },
  ];
}

export default async function AlertsPage() {
  await requireCurrentUser();
  const alerts = getStubAlerts();

  const openAlerts = alerts.filter((a) => a.status === 'open');
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved');
  const highCount = openAlerts.filter((a) => a.level === 'high').length;

  return (
    <div className="stack">
      <PageHeader
        title="预警中心"
        description="系统自动检测异常情况并生成预警，及时跟进处理"
        actions={<><button className="btn">筛选</button><button className="btn">导出</button></>}
      />

      <MetricGrid items={[
        { label: '未处理预警', value: String(openAlerts.length), hint: '需要跟进' },
        { label: '严重预警', value: String(highCount), hint: '需优先处理' },
        { label: '已处理', value: String(resolvedAlerts.length), hint: '本月已处理' },
        { label: '预警规则', value: '4 条', hint: '欠费/学业/缺勤/目标' },
      ]} />

      <section className="panel stack">
        <h3>⚡ 未处理预警</h3>
        <div className="summary-list">
          {openAlerts.map((alert) => (
            <div className="summary-item" key={alert.id} style={{ borderLeft: alert.level === 'high' ? '4px solid #ef4444' : alert.level === 'medium' ? '4px solid #f59e0b' : '4px solid #94a3b8', paddingLeft: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{levelLabel[alert.level]} {alert.title}</strong>
                <span className="badge">{typeLabel[alert.type]}</span>
              </div>
              <div className="subtle">{alert.detail}</div>
              <div className="subtle">触发时间：{alert.triggeredAt} · 规则：{alert.rule}</div>
              <div className="button-row" style={{ marginTop: 8 }}>
                <Link className="btn" href={`/students/${alert.studentId}`}>查看学生</Link>
                {alert.type === 'overdue_payment' ? <Link className="btn primary" href="/billing/invoices">处理欠费</Link> : null}
                {alert.type === 'academic_risk' ? <Link className="btn primary" href="/homework/submissions">查看作业</Link> : null}
                {alert.type === 'absent_streak' ? <Link className="btn primary" href="/attendance/board">查看考勤</Link> : null}
                {alert.type === 'goal_overdue' ? <Link className="btn primary" href="/growth/goals">跟进目标</Link> : null}
                <button className="btn">标记已处理</button>
              </div>
            </div>
          ))}
          {openAlerts.length === 0 ? <div className="subtle" style={{ padding: 16, textAlign: 'center' }}>🎉 暂无未处理预警</div> : null}
        </div>
      </section>

      <div className="grid-2">
        <SummaryPanel
          title="预警规则说明"
          items={[
            { name: '欠费预警', detail: '账单逾期 ≥ 7 天 → 自动创建，通知财务 + 班主任' },
            { name: '学业预警', detail: '连续 3 次作业正确率 < 60% → 通知班主任' },
            { name: '缺勤预警', detail: '连续 3 个工作日未签到 → 通知前台 + 班主任' },
            { name: '目标逾期', detail: '成长目标超期 7 天未 check-in → 通知班主任' },
          ]}
        />
        <TimelinePanel
          title="✅ 已处理预警"
          items={resolvedAlerts.map((a) => ({
            title: `${typeLabel[a.type]} · ${a.studentName}`,
            detail: `${a.detail} · 触发 ${a.triggeredAt}`,
          }))}
        />
      </div>
    </div>
  );
}
