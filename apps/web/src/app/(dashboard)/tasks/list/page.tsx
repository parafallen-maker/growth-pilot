import Link from 'next/link';
import { DataTable, FilterBar, MetricGrid, PageHeader, PaginationBar, TabStrip } from '@/components/business/page-blocks';
import { SubmitButton } from '@/components/business/submit-button';
import { requireCurrentUser } from '@/lib/current-user';
import { tasksService, type TaskQuery } from '@/services/tasks-service';
import { advanceTask } from '../actions';

const statusLabel: Record<string, string> = { open: '待办', in_progress: '进行中', done: '已完成' };
const priorityLabel: Record<string, string> = { high: '🔴 高', medium: '🟡 中', low: '⚪ 低' };
const typeLabel: Record<string, string> = {
  homework_followup: '作业跟进',
  overdue_payment: '欠费提醒',
  parent_communication: '家长沟通',
  goal_followup: '目标跟进',
  custom: '自定义',
};

function normalizeParam(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : undefined;
}

export default async function TaskListPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const tab = normalizeParam(query?.tab) ?? 'all';
  const taskQuery: TaskQuery = {
    pageNo: Number(normalizeParam(query?.pageNo) ?? 1) || 1,
    pageSize: Number(normalizeParam(query?.pageSize) ?? 10) || 10,
    keyword: normalizeParam(query?.keyword),
    taskType: normalizeParam(query?.taskType),
    priority: (normalizeParam(query?.priority) as TaskQuery['priority']) ?? 'all',
    ownerUserId: normalizeParam(query?.ownerUserId),
    dateFrom: normalizeParam(query?.dateFrom),
    dateTo: normalizeParam(query?.dateTo),
    sortBy: normalizeParam(query?.sortBy) ?? 'dueAt',
    sortOrder: normalizeParam(query?.sortOrder) === 'asc' ? 'asc' : 'desc',
  };

  if (tab !== 'all') {
    taskQuery.status = tab as TaskQuery['status'];
  }

  const result = await tasksService.query(taskQuery);
  const tasks = result.list;

  const metricsSource = await tasksService.query({ pageNo: 1, pageSize: 100, sortBy: 'dueAt', sortOrder: 'desc' });
  const todoCount = metricsSource.list.filter((t) => t.status === 'open').length;
  const doingCount = metricsSource.list.filter((t) => t.status === 'in_progress').length;
  const doneCount = metricsSource.list.filter((t) => t.status === 'done').length;

  return (
    <div className="stack">
      <PageHeader
        title="任务中心"
        description={`全校任务管理，当前登录：${currentUser.name}`}
        actions={<span className="badge success">真实 /tasks API</span>}
      />

      <MetricGrid items={[
        { label: '待办', value: String(todoCount), hint: '待处理' },
        { label: '进行中', value: String(doingCount), hint: '正在跟进' },
        { label: '已完成', value: String(doneCount), hint: '已闭环' },
        { label: '总计', value: String(metricsSource.page.total), hint: '全部任务' },
      ]} />

      <TabStrip
        baseUrl="/tasks/list"
        active={tab}
        tabs={[
          { label: '全部', value: 'all' },
          { label: '待办', value: 'open' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'done' },
        ]}
      />

      <FilterBar
        baseUrl="/tasks/list"
        fields={[
          { name: 'keyword', label: '关键词', placeholder: '任务标题 / owner / 备注' },
          { name: 'taskType', label: '类型', kind: 'select', options: [{ label: '全部类型', value: 'all' }, ...Object.entries(typeLabel).map(([value, label]) => ({ value, label }))] },
          { name: 'priority', label: '优先级', kind: 'select', options: [{ label: '全部优先级', value: 'all' }, { label: '高', value: 'high' }, { label: '中', value: 'medium' }, { label: '低', value: 'low' }] },
          { name: 'ownerUserId', label: '负责人', placeholder: 'user-teacher-001' },
          { name: 'dateFrom', label: '起始日期', inputType: 'date' },
          { name: 'dateTo', label: '结束日期', inputType: 'date' },
        ]}
      />

      <DataTable
        title={`任务列表（共 ${result.page.total} 条）`}
        columns={[
          { label: '优先级', sortKey: 'priority' },
          { label: '任务标题', sortKey: 'title' },
          { label: '类型', sortKey: 'taskType' },
          { label: '状态', sortKey: 'status' },
          { label: '负责人', sortKey: 'ownerUserId' },
          '关联学生',
          { label: '截止日期', sortKey: 'dueAt', defaultSortOrder: 'desc' },
          '操作',
        ]}
        rows={tasks.map((task) => [
          priorityLabel[task.priority] ?? task.priority,
          task.title,
          typeLabel[task.type] ?? task.type,
          statusLabel[task.status] ?? task.status,
          task.ownerUserId,
          task.studentId ? <Link className="btn small" href={`/students/${task.studentId}`}>查看</Link> : '—',
          task.dueLabel,
          task.status === 'open' || task.status === 'in_progress' ? (
            <form action={advanceTask}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="nextStatus" value={task.status === 'open' ? 'in_progress' : 'done'} />
              <input type="hidden" name="returnPath" value="/tasks/list" />
              <SubmitButton className="btn primary" pendingLabel="处理中...">{task.status === 'open' ? '开始' : '完成'}</SubmitButton>
            </form>
          ) : '—',
        ])}
      />

      <PaginationBar pageNo={result.page.pageNo} pageSize={result.page.pageSize} total={result.page.total} baseUrl="/tasks/list" />
    </div>
  );
}
