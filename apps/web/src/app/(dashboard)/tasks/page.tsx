import Link from 'next/link';
import { MetricGrid, PageHeader, PaginationBar, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { SubmitButton } from '@/components/business/submit-button';
import { requireCurrentUser } from '@/lib/current-user';
import { roleLabels, type AppRole } from '@/lib/navigation';
import { tasksService } from '@/services/tasks-service';
import { advanceTask } from './actions';
import {
  TASK_PRIORITY_LABELS as priorityLabel,
  TASK_TYPE_LABELS as typeLabel,
  getPriorityStyle,
} from '@/lib/business-logic';

const taskStatusLabel: Record<string, string> = {
  open: '待办',
  in_progress: '进行中',
  done: '已完成',
};

function taskActionLink(taskType: string) {
  if (taskType === 'homework_followup') return '/homework/submissions';
  if (taskType === 'goal_followup') return '/growth/goals';
  if (taskType === 'parent_communication') return '/communication/records';
  if (taskType === 'overdue_payment') return '/billing/invoices';
  return null;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const pageNo = Number(query?.pageNo ?? 1) || 1;
  const pageSize = Number(query?.pageSize ?? 10) || 10;
  const result = await tasksService.query({
    pageNo,
    pageSize,
    ownerUserId: currentUser.id,
    sortBy: typeof query?.sortBy === 'string' ? query.sortBy : 'dueAt',
    sortOrder: query?.sortOrder === 'asc' ? 'asc' : 'desc',
  });
  const tasks = result.list;

  const todoCount = tasks.filter((t) => t.status === 'open').length;
  const doingCount = tasks.filter((t) => t.status === 'in_progress').length;
  const highCount = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length;
  const overdueCount = tasks.filter((t) => t.status !== 'done' && new Date(t.dueDate).getTime() < Date.now()).length;

  return (
    <div className="stack">
      <PageHeader
        title="我的待办"
        description={`${roleLabels[currentUser.role as AppRole] ?? currentUser.role} · ${currentUser.name} 的待办事项`}
        actions={<Link className="btn" href="/tasks/list">进入任务中心</Link>}
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
            detail: `${typeLabel[t.type] ?? t.type} · 截止 ${t.dueLabel}`,
          }))}
        />
        <SummaryPanel
          title="📋 一般任务"
          items={tasks.filter((t) => t.priority !== 'high' && t.status !== 'done').map((t) => ({
            name: t.title,
            detail: `${typeLabel[t.type] ?? t.type} · 截止 ${t.dueLabel} · ${taskStatusLabel[t.status] ?? t.status}`,
          }))}
        />
      </div>

      <section className="panel stack">
        <div className="page-header">
          <div>
            <h3>待办列表</h3>
            <p>已切到真实 /tasks API，仅展示当前登录人的任务。</p>
          </div>
          <span className="badge success">GET /tasks</span>
        </div>
        <div className="summary-list">
          {tasks.filter((t) => t.status !== 'done').map((task) => {
            const link = taskActionLink(task.type);
            const nextStatus = task.status === 'open' ? 'in_progress' : task.status === 'in_progress' ? 'done' : null;
            const buttonLabel = task.status === 'open' ? '开始处理' : task.status === 'in_progress' ? '标记完成' : null;

            return (
              <div className="summary-item" key={task.id} style={{ ...getPriorityStyle(task.priority), paddingLeft: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <strong>{priorityLabel[task.priority]} {task.title}</strong>
                  <span className="badge">{taskStatusLabel[task.status] ?? task.status}</span>
                </div>
                <div className="subtle">
                  {typeLabel[task.type] ?? task.type} · 截止 {task.dueLabel} · owner {task.ownerUserId}
                </div>
                {task.description ? <div className="subtle">{task.description}</div> : null}
                <div className="button-row" style={{ marginTop: 8 }}>
                  {task.studentId ? <Link className="btn" href={`/students/${task.studentId}`}>查看学生</Link> : null}
                  {link ? <Link className="btn" href={link}>关联页面</Link> : null}
                  {nextStatus && buttonLabel ? (
                    <form action={advanceTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="nextStatus" value={nextStatus} />
                      <input type="hidden" name="returnPath" value="/tasks" />
                      <SubmitButton pendingLabel="提交中...">{buttonLabel}</SubmitButton>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
          {tasks.filter((t) => t.status !== 'done').length === 0 ? <div className="subtle" style={{ padding: 16, textAlign: 'center' }}>当前没有待处理任务</div> : null}
        </div>
      </section>

      <PaginationBar pageNo={result.page.pageNo} pageSize={result.page.pageSize} total={result.page.total} />

      <TimelinePanel
        title="已完成"
        items={tasks.filter((t) => t.status === 'done').map((t) => ({
          title: `✅ ${t.title}`,
          detail: `${typeLabel[t.type] ?? t.type} · ${t.dueLabel}`,
        }))}
      />
    </div>
  );
}
