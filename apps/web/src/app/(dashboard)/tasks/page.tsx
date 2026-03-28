import Link from 'next/link';
import { PageHeader, MetricGrid, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { requireCurrentUser } from '@/lib/current-user';
import { roleLabels, type AppRole } from '@/lib/navigation';

const priorityLabel: Record<string, string> = { high: '🔴 紧急', medium: '🟡 一般', low: '⚪ 低' };
const statusLabel: Record<string, string> = { todo: '待办', doing: '进行中', done: '已完成', canceled: '已取消' };
const typeLabel: Record<string, string> = {
  homework_followup: '作业跟进',
  overdue_payment: '欠费提醒',
  parent_communication: '家长沟通',
  goal_followup: '目标跟进',
  custom: '自定义',
};

// Stub data until backend /tasks endpoint is available
function getStubTasks(role: string) {
  const isTeacher = role === 'growth_advisor' || role === 'subject_teacher';
  if (isTeacher) {
    return [
      { id: 't1', title: '复核张小明 3/25 数学作业', type: 'homework_followup', priority: 'high', status: 'todo', dueDate: '2026-03-26', studentName: '张小明', studentId: 'stub-s1', source: '系统自动' },
      { id: 't2', title: '复核李小红 3/25 语文作业', type: 'homework_followup', priority: 'medium', status: 'todo', dueDate: '2026-03-26', studentName: '李小红', studentId: 'stub-s2', source: '系统自动' },
      { id: 't3', title: '跟进王小华"每日阅读30分钟"目标', type: 'goal_followup', priority: 'medium', status: 'todo', dueDate: '2026-03-28', studentName: '王小华', studentId: 'stub-s3', source: '系统自动' },
      { id: 't4', title: '联系赵小飞家长 — 12天未沟通', type: 'parent_communication', priority: 'high', status: 'todo', dueDate: '2026-03-27', studentName: '赵小飞', studentId: 'stub-s4', source: '系统自动' },
      { id: 't5', title: '完成本周成长报告（5名学生）', type: 'custom', priority: 'medium', status: 'doing', dueDate: '2026-03-28', studentName: '', studentId: '', source: '手动创建' },
    ];
  }
  return [
    { id: 't10', title: '处理张小明欠费账单 INV-202603-001', type: 'overdue_payment', priority: 'high', status: 'todo', dueDate: '2026-03-26', studentName: '张小明', studentId: 'stub-s1', source: '系统自动' },
    { id: 't11', title: '审核新教师入职材料', type: 'custom', priority: 'medium', status: 'todo', dueDate: '2026-03-28', studentName: '', studentId: '', source: '手动创建' },
  ];
}

export default async function TasksPage() {
  const currentUser = await requireCurrentUser();
  const tasks = getStubTasks(currentUser.role);

  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const doingCount = tasks.filter((t) => t.status === 'doing').length;
  const highCount = tasks.filter((t) => t.priority === 'high' && t.status !== 'done' && t.status !== 'canceled').length;
  const overdueCount = tasks.filter((t) => t.status === 'todo' && new Date(t.dueDate) < new Date()).length;

  return (
    <div className="stack">
      <PageHeader
        title="我的待办"
        description={`${roleLabels[currentUser.role as AppRole] ?? currentUser.role} · ${currentUser.name} 的待办事项`}
        actions={<><button className="btn primary">新建任务</button><button className="btn">筛选</button></>}
      />

      <MetricGrid items={[
        { label: '待办', value: String(todoCount), hint: '待处理任务' },
        { label: '进行中', value: String(doingCount), hint: '正在跟进' },
        { label: '紧急', value: String(highCount), hint: '需优先处理' },
        { label: '已逾期', value: String(overdueCount), hint: '超过截止日期' },
      ]} />

      <div className="grid-2">
        <SummaryPanel
          title="🔴 紧急任务"
          items={tasks.filter((t) => t.priority === 'high' && t.status !== 'done').map((t) => ({
            name: t.title,
            detail: `${typeLabel[t.type] ?? t.type} · 截止 ${t.dueDate}${t.studentName ? ` · ${t.studentName}` : ''} · ${t.source}`,
          }))}
        />
        <SummaryPanel
          title="📋 一般任务"
          items={tasks.filter((t) => t.priority !== 'high' && t.status !== 'done').map((t) => ({
            name: t.title,
            detail: `${typeLabel[t.type] ?? t.type} · 截止 ${t.dueDate}${t.studentName ? ` · ${t.studentName}` : ''} · ${statusLabel[t.status] ?? t.status}`,
          }))}
        />
      </div>

      <section className="panel stack">
        <h3>待办列表</h3>
        <div className="summary-list">
          {tasks.filter((t) => t.status !== 'done' && t.status !== 'canceled').map((task) => (
            <div className="summary-item" key={task.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{priorityLabel[task.priority]} {task.title}</strong>
                <span className="badge">{statusLabel[task.status]}</span>
              </div>
              <div className="subtle">
                {typeLabel[task.type]} · 截止 {task.dueDate} · {task.source}
              </div>
              <div className="button-row" style={{ marginTop: 8 }}>
                {task.studentId ? <Link className="btn" href={`/students/${task.studentId}`}>查看学生</Link> : null}
                {task.type === 'homework_followup' ? <Link className="btn primary" href="/homework/submissions">去复核</Link> : null}
                {task.type === 'goal_followup' ? <Link className="btn primary" href="/growth/goals">去跟进</Link> : null}
                {task.type === 'parent_communication' ? <Link className="btn primary" href="/communication/records">去沟通</Link> : null}
                {task.type === 'overdue_payment' ? <Link className="btn primary" href="/billing/invoices">去处理</Link> : null}
                <button className="btn">标记完成</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <TimelinePanel
        title="已完成"
        items={tasks.filter((t) => t.status === 'done').map((t) => ({
          title: `✅ ${t.title}`,
          detail: `${typeLabel[t.type]} · ${t.dueDate}`,
        }))}
      />
    </div>
  );
}
