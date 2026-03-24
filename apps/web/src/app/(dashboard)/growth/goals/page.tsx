import { FilterBar, PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { queryKeys } from '@/features/shared/query-keys';
import { growthPermissions } from '@/features/growth/constants';
import { growthService } from '@/services/growth-service';
import { mockCurrentUser } from '@/lib/navigation';

export default function GrowthGoalsPage() {
  const allowed = hasPermission(mockCurrentUser.permissions, growthPermissions.goalsView);
  const result = growthService.queryGoals({ pageNo: 1, pageSize: 20, status: 'active', sortBy: 'dueDate', sortOrder: 'asc' });
  const detail = growthService.detailGoal(result.list[0]?.goalId ?? 'goal-1001');
  const action = growthService.actionGoal(result.list[0]?.goalId ?? 'goal-1001');

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="成长目标" permissionCode={growthPermissions.goalsView} />}>
      <div className="stack">
        <PageHeader
          title="成长目标骨架"
          description={`P14 已放目标列表、详情抽屉占位、check-in 动作位。query key: ${JSON.stringify(queryKeys.growthGoals({ pageNo: 1, pageSize: 20, status: 'active' }))}`}
          actions={<><button className="btn primary">新建目标</button><button className="btn">批量关闭</button><button className="btn">同步家庭任务</button></>}
        />
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
                <p>右侧抽屉是占位态，后续可直接换成 client drawer。</p>
              </div>
              <span className="badge">list / drawer / check-in</span>
            </div>
            {result.list.map((item) => (
              <article key={item.goalId} className="selection-card active-card">
                <div className="page-header" style={{ marginBottom: 8 }}>
                  <strong>{item.title}</strong>
                  <span className={`badge${item.status === 'active' ? ' success' : ''}`}>{item.status}</span>
                </div>
                <div className="subtle">{item.studentName} · {item.goalType} · 进度 {item.progress} / 目标 {item.targetValue}</div>
                <div className="button-row" style={{ marginTop: 12 }}>
                  <button className="btn primary">打开详情抽屉</button>
                  <button className="btn">编辑</button>
                  <button className="btn">Check-in</button>
                </div>
              </article>
            ))}
          </section>
          <aside className="panel stack">
            <div className="page-header">
              <div>
                <h3>详情抽屉 / 占位</h3>
                <p>{detail.nextAction}</p>
              </div>
              <button className="btn primary">提交 check-in</button>
            </div>
            <SummaryPanel title="基础信息" items={detail.profile} />
            <TimelinePanel title="跟进记录" items={detail.followups} />
            <SummaryPanel title="关联信息" items={detail.linkedItems} />
            <section className="panel" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
              <div className="selection-card">
                <strong>Check-in 动作位</strong>
                <div className="subtle" style={{ marginTop: 8 }}>action: {action.action} · permission: {action.permissionCode} · Idempotency-Key: required</div>
                <div className="form-grid" style={{ marginTop: 12 }}>
                  <div className="field"><label>进度增量</label><input className="input" defaultValue="1" /></div>
                  <div className="field"><label>状态</label><input className="input" defaultValue="本周完成 1 次复盘" /></div>
                  <div className="field form-span-2"><label>备注</label><textarea className="textarea" defaultValue="接后端 check-in 接口后，提交成功需 invalidate growth-goals / goal-detail。" /></div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </PermissionGuard>
  );
}
