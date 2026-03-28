import Link from 'next/link';
import { PageHeader, MetricGrid, DataTable, FilterBar, TabStrip } from '@/components/business/page-blocks';
import { requireCurrentUser } from '@/lib/current-user';

const statusLabel: Record<string, string> = { todo: '待办', doing: '进行中', done: '已完成', canceled: '已取消' };
const priorityLabel: Record<string, string> = { high: '🔴 高', medium: '🟡 中', low: '⚪ 低' };
const typeLabel: Record<string, string> = {
  homework_followup: '作业跟进',
  overdue_payment: '欠费提醒',
  parent_communication: '家长沟通',
  goal_followup: '目标跟进',
  custom: '自定义',
};

// Stub data
function getAllTasks() {
  return [
    { id: 't1', title: '复核张小明数学作业', type: 'homework_followup', priority: 'high', status: 'todo', assignee: '王老师', dueDate: '2026-03-26', studentName: '张小明', source: '系统' },
    { id: 't2', title: '联系赵小飞家长', type: 'parent_communication', priority: 'high', status: 'todo', assignee: '王老师', dueDate: '2026-03-27', studentName: '赵小飞', source: '系统' },
    { id: 't3', title: '跟进王小华阅读目标', type: 'goal_followup', priority: 'medium', status: 'doing', assignee: '李老师', dueDate: '2026-03-28', studentName: '王小华', source: '系统' },
    { id: 't4', title: '处理张小明欠费账单', type: 'overdue_payment', priority: 'high', status: 'todo', assignee: '财务张', dueDate: '2026-03-26', studentName: '张小明', source: '系统' },
    { id: 't5', title: '完成周报 5 名学生', type: 'custom', priority: 'medium', status: 'doing', assignee: '王老师', dueDate: '2026-03-28', studentName: '', source: '手动' },
    { id: 't6', title: '新学期教材采购', type: 'custom', priority: 'low', status: 'todo', assignee: '教务刘', dueDate: '2026-04-01', studentName: '', source: '手动' },
    { id: 't7', title: '完成陈小芳习惯观察', type: 'homework_followup', priority: 'medium', status: 'done', assignee: '李老师', dueDate: '2026-03-24', studentName: '陈小芳', source: '系统' },
    { id: 't8', title: '处理李小红退费', type: 'overdue_payment', priority: 'high', status: 'done', assignee: '财务张', dueDate: '2026-03-22', studentName: '李小红', source: '系统' },
  ];
}

export default async function TaskListPage() {
  await requireCurrentUser();
  const tasks = getAllTasks();

  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const doingCount = tasks.filter((t) => t.status === 'doing').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="stack">
      <PageHeader
        title="任务中心"
        description="全校任务管理，支持按负责人、类型、状态筛选"
        actions={<><button className="btn primary">新建任务</button><button className="btn">导出</button></>}
      />

      <MetricGrid items={[
        { label: '待办', value: String(todoCount), hint: '待处理' },
        { label: '进行中', value: String(doingCount), hint: '正在跟进' },
        { label: '已完成', value: String(doneCount), hint: '本月已完成' },
        { label: '总计', value: String(tasks.length), hint: '全部任务' },
      ]} />

      <TabStrip tabs={['全部', '待办', '进行中', '已完成', '已取消']} active="全部" />

      <FilterBar fields={[
        { label: '关键词', value: '任务标题 / 学生姓名' },
        { label: '类型', value: '全部类型', kind: 'select' },
        { label: '优先级', value: '全部', kind: 'select' },
        { label: '负责人', value: '全部成员', kind: 'select' },
        { label: '截止日期', value: '' },
      ]} />

      <DataTable
        title="任务列表"
        columns={['优先级', '任务标题', '类型', '状态', '负责人', '关联学生', '截止日期', '来源', '操作']}
        rows={tasks.map((t) => [
          priorityLabel[t.priority] ?? t.priority,
          t.title,
          typeLabel[t.type] ?? t.type,
          statusLabel[t.status] ?? t.status,
          t.assignee,
          t.studentName || '—',
          t.dueDate,
          t.source,
          t.status === 'todo' ? '开始' : t.status === 'doing' ? '完成' : '—',
        ])}
      />

      <section className="panel stack">
        <h3>任务详情</h3>
        <div className="summary-list">
          {tasks.filter((t) => t.status !== 'done' && t.status !== 'canceled').map((task) => (
            <div className="summary-item" key={task.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{priorityLabel[task.priority]} {task.title}</strong>
                <span className="badge">{statusLabel[task.status]}</span>
              </div>
              <div className="subtle">
                {typeLabel[task.type]} · {task.assignee} · 截止 {task.dueDate}{task.studentName ? ` · 学生：${task.studentName}` : ''}
              </div>
              <div className="button-row" style={{ marginTop: 8 }}>
                {task.studentName ? <Link className="btn" href="/students">查看学生</Link> : null}
                {task.status === 'todo' ? <button className="btn primary">开始处理</button> : null}
                {task.status === 'doing' ? <button className="btn primary">标记完成</button> : null}
                <button className="btn">取消</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
