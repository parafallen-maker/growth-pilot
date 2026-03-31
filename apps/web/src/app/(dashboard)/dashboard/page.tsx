import { Suspense } from 'react';
import { ChartPanel, MetricGrid, PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { analyticsService } from '@/services/analytics-service';
import { requireCurrentUser } from '@/lib/current-user';
import { roleLabels, type AppRole } from '@/lib/navigation';
import { ALERT_TYPE_LABELS, TASK_PRIORITY_LABELS, TASK_TYPE_LABELS, getPriorityStyle } from '@/lib/business-logic';
import { CsvExportButton } from '../_components/csv-export-button';
import { TermSwitcher } from './term-switcher';
import Link from 'next/link';

const taskStatusLabel: Record<string, string> = { open: '待办', in_progress: '进行中', done: '已完成' };
const aiStatusLabel: Record<string, string> = { pending: '待分析', processing: '分析中', completed: '已分析', failed: '分析失败' };
const reviewStatusLabel: Record<string, string> = { unreviewed: '待复核', reviewing: '复核中', reviewed: '已复核', published: '已发布' };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const currentUser = await requireCurrentUser();
  const campusId = 'campus-guiyang';
  const termId = '2026-spring';
  const isTeacher = currentUser.role === 'growth_advisor' || currentUser.role === 'subject_teacher';
  if (isTeacher) return <TeacherDashboard currentUser={currentUser} campusId={campusId} termId={termId} />;
  return <AdminDashboard campusId={campusId} termId={termId} />;
}

async function TeacherDashboard({ currentUser, campusId, termId }: { currentUser: any; campusId: string; termId: string }) {
  const workbench = await analyticsService.queryTeacherWorkbench({ campusId, termId, teacherId: currentUser.id });
  const urgentActions = [...workbench.alerts.filter((alert) => alert.status !== 'resolved').map((alert) => ({ id: alert.id, title: alert.title, priority: alert.alertLevel, link: '/alerts' })), ...workbench.tasks.filter((task) => task.status !== 'done').map((task) => ({ id: task.id, title: task.title, priority: task.priority, link: '/tasks' }))].slice(0, 6);
  const weeklyStats = [{ name: '待复核作业', detail: `${workbench.summary.pendingHomeworkCount} 份` }, { name: '开放任务', detail: `${workbench.summary.openTaskCount} 条` }, { name: '开放预警', detail: `${workbench.summary.openAlertCount} 条` }, { name: '沟通触达', detail: `${workbench.summary.communicationTouchCount} 次` }];
  const workbenchChart = [{ label: '待复核作业', value: workbench.summary.pendingHomeworkCount, valueLabel: `${workbench.summary.pendingHomeworkCount} 份`, detail: '本周期需优先处理', tone: 'warning' as const }, { label: '开放任务', value: workbench.summary.openTaskCount, valueLabel: `${workbench.summary.openTaskCount} 条`, detail: '待处理任务', tone: 'brand' as const }, { label: '开放预警', value: workbench.summary.openAlertCount, valueLabel: `${workbench.summary.openAlertCount} 条`, detail: '待处理预警', tone: 'danger' as const }, { label: '沟通触达', value: workbench.summary.communicationTouchCount, valueLabel: `${workbench.summary.communicationTouchCount} 次`, detail: '当前周期累计触达', tone: 'success' as const }];
  return <div className="stack"><PageHeader title={`今日工作台 · ${currentUser.name}`} description={`${roleLabels[currentUser.role as AppRole] ?? currentUser.role} · ${currentUser.campusName} · ${termId}`} actions={<><Link className="btn primary" href="/tasks">查看我的任务</Link><CsvExportButton filename="teacher-workbench.csv" headers={['指标', '值']} rows={workbenchChart.map((item) => [item.label, item.valueLabel])} /></>} /><MetricGrid items={[{ label: '待复核作业', value: String(workbench.summary.pendingHomeworkCount), hint: '本周期待处理' }, { label: '待跟进任务', value: String(workbench.summary.openTaskCount), hint: '未完成任务' }, { label: '新增预警', value: String(workbench.summary.openAlertCount), hint: '待处理预警' }, { label: '本期沟通', value: String(workbench.summary.communicationTouchCount), hint: '本期累计沟通' }]} /><ChartPanel title="教师工作台趋势焦点" description="把关键待办转成真正可比较的图表，而不是只停留在摘要卡片。" items={workbenchChart} /><div className="grid-2"><section className="panel stack"><h3>⏰ 今日紧急</h3><div className="summary-list">{urgentActions.map((action) => <div className="summary-item" key={action.id} style={{ ...getPriorityStyle(action.priority), paddingLeft: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><strong>{TASK_PRIORITY_LABELS[action.priority] ?? action.priority} {action.title}</strong><Link href={action.link} className="btn small">去处理</Link></div></div>)}{urgentActions.length === 0 ? <div className="subtle">当前没有紧急项。</div> : null}</div></section><SummaryPanel title="📊 本周带班数据" items={weeklyStats} /></div><div className="grid-2"><SummaryPanel title="📝 待复核队列" items={workbench.homeworkQueue.slice(0, 6).map((item) => ({ name: `${item.subject} · ${item.homeworkDate}`, detail: `${aiStatusLabel[item.aiStatus] ?? item.aiStatus} / ${reviewStatusLabel[item.reviewStatus] ?? item.reviewStatus}` }))} /><SummaryPanel title="📞 任务与预警提醒" items={[...workbench.tasks.slice(0, 3).map((task) => ({ name: TASK_TYPE_LABELS[task.taskType] ?? task.taskType, detail: `${task.title} · ${taskStatusLabel[task.status] ?? task.status}` })), ...workbench.alerts.slice(0, 3).map((alert) => ({ name: ALERT_TYPE_LABELS[alert.alertType] ?? alert.alertType, detail: alert.title }))]} /></div></div>;
}

async function AdminDashboard({ campusId, termId }: { campusId: string; termId: string }) {
  const data = await analyticsService.queryOverview({ campusId, termId });
  return <div className="stack"><PageHeader title="经营总览" description="查看校区核心指标和运营状况" actions={<><TermSwitcher campusId={campusId} termId={termId} /><CsvExportButton filename="analytics-overview.csv" headers={['指标', '值', '说明']} rows={data.metrics.map((item) => [item.label, item.value, item.hint])} /></>} /><MetricGrid items={data.metrics} /><div className="grid-2">{data.charts.map((chart) => <ChartPanel key={chart.title} title={chart.title} description={chart.description} items={chart.items} />)}</div><div className="grid-2"><SummaryPanel title="经营趋势摘要" items={data.chartCards} /><SummaryPanel title="运营摘要" items={data.tableCards} /></div><div className="grid-2"><TimelinePanel title="治理提示" items={data.governance.map((item) => ({ title: item.name, detail: item.detail }))} /><TimelinePanel title="全校待办" items={[{ title: '今日需复核总数', detail: '24 份' }, { title: '逾期未缴费', detail: '¥12,400' }]} /></div></div>;
}
