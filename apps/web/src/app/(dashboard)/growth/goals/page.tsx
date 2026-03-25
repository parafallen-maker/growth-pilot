import { FilterBar, PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { queryKeys } from '@/features/shared/query-keys';
import { growthPermissions } from '@/features/growth/constants';
import { growthService } from '@/services/growth-service';
import { requireCurrentUser } from '@/lib/current-user';
import { studentService } from '@/services/students-service';
import { createGrowthGoal, createGrowthGoalCheckin } from '../actions';

export default async function GrowthGoalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; checkin?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const allowed = hasPermission(currentUser.permissions, growthPermissions.goalsView);
  const [result, students] = await Promise.all([
    growthService.queryGoals({ pageNo: 1, pageSize: 20, status: 'active', sortBy: 'dueDate', sortOrder: 'asc' }),
    studentService.query({ pageNo: 1, pageSize: 50, status: 'active' }),
  ]);
  const detail = await growthService.detailGoal(result.list[0]?.goalId ?? 'goal-1001');
  const action = growthService.actionGoal(result.list[0]?.goalId ?? 'goal-1001');

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="成长目标" permissionCode={growthPermissions.goalsView} />}>
      <div className="stack">
        <PageHeader
          title="成长目标"
          description={`真实 goals 列表已接：${JSON.stringify(queryKeys.growthGoals({ pageNo: 1, pageSize: 20, status: 'active' }))}`}
          actions={<><a className="btn primary" href="#goal-create-form">新建目标</a><a className="btn" href="#goal-checkin-form">提交 Check-in</a><button className="btn">同步家庭任务</button></>}
        />
        {query?.created ? <section className="panel"><div className="badge success">目标已创建：{query.created}</div></section> : null}
        {query?.checkin ? <section className="panel"><div className="badge success">Check-in 已记录：{query.checkin}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}

        <section className="panel stack" id="goal-create-form">
          <div className="page-header">
            <div>
              <h3>新建目标</h3>
              <p>已接 POST /growth/goals，可直接创建目标条目。</p>
            </div>
            <span className="badge success">POST /growth/goals</span>
          </div>
          <form className="form-grid" action={createGrowthGoal}>
            <div className="field"><label>学生</label><select className="select" name="studentId" required defaultValue={students.list[0]?.id ?? ''}>{students.list.map((student) => <option key={student.id} value={student.id}>{student.name} / {student.studentNo}</option>)}</select></div>
            <div className="field"><label>目标类型</label><select className="select" name="goalType" defaultValue="habit"><option value="habit">habit</option><option value="academic">academic</option><option value="behavior">behavior</option></select></div>
            <div className="field form-span-2"><label>标题</label><input className="input" name="title" placeholder="例如：本周完成 5 次主动复盘" required /></div>
            <div className="field"><label>责任角色</label><input className="input" name="ownerRole" defaultValue="teacher" /></div>
            <div className="field"><label>指标类型</label><input className="input" name="metricType" defaultValue="count" /></div>
            <div className="field"><label>基线值</label><input className="input" type="number" name="baselineValue" defaultValue="0" /></div>
            <div className="field"><label>当前值</label><input className="input" type="number" name="currentValue" defaultValue="0" /></div>
            <div className="field"><label>目标值</label><input className="input" type="number" name="targetValue" defaultValue="5" /></div>
            <div className="field"><label>开始日期</label><input className="input" type="date" name="startDate" /></div>
            <div className="field"><label>截止日期</label><input className="input" type="date" name="dueDate" /></div>
            <div className="field"><label>状态</label><select className="select" name="status" defaultValue="active"><option value="active">active</option><option value="draft">draft</option><option value="closed">closed</option></select></div>
            <div className="field form-span-2"><label>描述</label><textarea className="textarea" name="description" placeholder="目标背景、评价标准、跟进方式" /></div>
            <div className="button-row form-span-2"><button className="btn primary" type="submit">创建目标</button></div>
          </form>
        </section>

        <FilterBar fields={[
          { label: '关键词', value: '标题 / 学生' },
          { label: '目标类型', value: '全部类型', kind: 'select' },
          { label: '状态', value: '进行中', kind: 'select' },
          { label: '截止日期', value: '未来 30 天' },
        ]} />
        <div className="grid-growth-goals">
          <section className="panel stack">
            <div className="page-header">
              <div>
                <h3>目标列表</h3>
                <p>当前页展示真实 goal 数据。</p>
              </div>
              <span className="badge">{result.page.total} goals</span>
            </div>
            {result.list.map((item) => (
              <article key={item.goalId} className="selection-card active-card">
                <div className="page-header" style={{ marginBottom: 8 }}>
                  <strong>{item.title}</strong>
                  <span className={`badge${item.status === 'active' ? ' success' : ''}`}>{item.status}</span>
                </div>
                <div className="subtle">{item.studentName} · {item.goalType} · 进度 {item.progress} / 目标 {item.targetValue}</div>
                <div className="subtle">check-ins: {item.checkins.length}</div>
              </article>
            ))}
          </section>
          <aside className="panel stack">
            <div className="page-header">
              <div>
                <h3>详情侧栏</h3>
                <p>{detail.nextAction}</p>
              </div>
              <span className="badge success">POST /checkins</span>
            </div>
            <SummaryPanel title="基础信息" items={detail.profile} />
            <TimelinePanel title="跟进记录" items={detail.followups.length ? detail.followups : [{ title: '暂无 check-in', detail: '当前目标还没有跟进记录。' }]} />
            <SummaryPanel title="关联信息" items={detail.linkedItems} />
            <section className="panel" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }} id="goal-checkin-form">
              <form className="selection-card" action={createGrowthGoalCheckin}>
                <input type="hidden" name="goalId" value={action.goalId} />
                <strong>提交 Check-in</strong>
                <div className="subtle" style={{ marginTop: 8 }}>endpoint: {action.endpoint} · permission: {action.permissionCode}</div>
                <div className="form-grid" style={{ marginTop: 12 }}>
                  <div className="field"><label>跟进日期</label><input className="input" type="date" name="checkinDate" required /></div>
                  <div className="field"><label>进度值</label><input className="input" type="number" name="progressValue" defaultValue="1" /></div>
                  <div className="field form-span-2"><label>进度说明</label><textarea className="textarea" name="progressNote" defaultValue="本周完成一次复盘。" /></div>
                  <div className="field form-span-2"><label>下一步动作</label><textarea className="textarea" name="nextAction" defaultValue="下周继续跟进并补充家庭反馈。" /></div>
                </div>
                <div className="button-row" style={{ marginTop: 12 }}><button className="btn primary" type="submit">提交 check-in</button></div>
              </form>
            </section>
          </aside>
        </div>
      </div>
    </PermissionGuard>
  );
}
