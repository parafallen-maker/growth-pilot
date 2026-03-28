import { MetricGrid, PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { analyticsService } from '@/services/analytics-service';
import { requireCurrentUser } from '@/lib/current-user';
import { roleLabels, type AppRole } from '@/lib/navigation';
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  getPriorityStyle
} from '@/lib/business-logic';
import Link from 'next/link';

export default async function DashboardPage() {
  const currentUser = await requireCurrentUser();
  const campusId = 'campus-guiyang';
  const termId = '2026-spring';

  // 角色判断：班主任和科任老师看到的是"今日工作台"
  const isTeacher = currentUser.role === 'growth_advisor' || currentUser.role === 'subject_teacher';

  if (isTeacher) {
    return <TeacherDashboard currentUser={currentUser} />;
  }

  return <AdminDashboard campusId={campusId} termId={termId} />;
}

async function TeacherDashboard({ currentUser }: { currentUser: any }) {
  // 模拟教师端数据，后期对接真实 API
  const metrics = [
    { label: '待复核作业', value: '8', hint: '需及时复核并发布' },
    { label: '待跟进目标', value: '3', hint: '学生成长目标需更新' },
    { label: '本周沟通', value: '5', hint: '待沟通家庭数量' },
    { label: '新增预警', value: '2', hint: '需立即关注的异常' },
  ];

  const urgentActions = [
    { id: 'u1', title: '张小明 数学正确率连续 3 次 < 60%', type: 'academic_risk', priority: 'high', link: '/alerts' },
    { id: 'u2', title: '李小红 语文练习册 3/25 待复核', type: 'homework_followup', priority: 'medium', link: '/homework/submissions' },
    { id: 'u3', title: '赵小飞 成长目标"阅读 30min"已超线', type: 'goal_overdue', priority: 'low', link: '/growth/goals' },
  ];

  const weeklyStats = [
    { name: '复核完成率', detail: '85% (较上周 ↑5%)' },
    { name: '平均正确率', detail: '78% (较上周 ↓2%)' },
    { name: '观察记录', detail: '4 条' },
    { name: '沟通记录', detail: '2 次' },
  ];

  return (
    <div className="stack">
      <PageHeader
        title={`今日工作台 · ${currentUser.name}`}
        description={`${roleLabels[currentUser.role as AppRole] ?? currentUser.role} · 贵阳校区 · 2026春季学期`}
        actions={<><button className="btn primary">新建任务</button></>}
      />

      <MetricGrid items={metrics} />

      <div className="grid-2">
        <section className="panel stack">
          <h3>⏰ 今日紧急</h3>
          <div className="summary-list">
            {urgentActions.map((action) => (
              <div className="summary-item" key={action.id} style={{ ...getPriorityStyle(action.priority), paddingLeft: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{TASK_PRIORITY_LABELS[action.priority]} {action.title}</strong>
                  <Link href={action.link} className="btn small">去处理</Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <SummaryPanel title="📊 本周带班数据" items={weeklyStats} />
      </div>

      <div className="grid-2">
        <SummaryPanel
          title="📝 待复核队列"
          items={[
            { name: '王小华 语文 3/25', detail: 'AI 已分析，待审核' },
            { name: '李小明 数学 3/25', detail: 'AI 已分析，待审核' },
            { name: '张小飞 英语 3/24', detail: '由助教上传' },
          ]}
        />
        <SummaryPanel
          title="📞 沟通提醒"
          items={[
            { name: '李小红家庭', detail: '超过 12 天未沟通' },
            { name: '王小华家庭', detail: '超过 8 天未沟通' },
          ]}
        />
      </div>
    </div>
  );
}

async function AdminDashboard({ campusId, termId }: { campusId: string; termId: string }) {
  const data = await analyticsService.queryOverview({ campusId, termId });

  return (
    <div className="stack">
      <PageHeader
        title="经营总览"
        description="查看校区核心指标和运营状况"
        actions={<><button className="btn primary">切学期</button><button className="btn">导出截图</button></>}
      />
      <MetricGrid items={data.metrics} />
      <div className="grid-2">
        <SummaryPanel title="经营趋势" items={data.chartCards} />
        <SummaryPanel title="运营摘要" items={data.tableCards} />
      </div>
      <div className="grid-2">
        <TimelinePanel title="治理提示" items={data.governance.map((item) => ({ title: item.name, detail: item.detail }))} />
        <TimelinePanel title="全校待办" items={[{ title: '今日需复核总数', detail: '24 份' }, { title: '逾期未缴费', detail: '¥12,400' }]} />
      </div>
    </div>
  );
}
