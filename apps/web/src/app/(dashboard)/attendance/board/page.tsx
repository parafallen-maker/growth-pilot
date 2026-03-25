import { FilterBar, MetricGrid, PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { attendancePermissions } from '@/features/attendance/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { attendanceService } from '@/services/attendance-service';

export default async function AttendanceBoardPage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, attendancePermissions.boardView);
  const today = new Date().toISOString().slice(0, 10);
  const filters = {
    pageNo: 1,
    pageSize: 20,
    campusId: currentUser.campusIds[0],
    date: today,
    eventType: 'all',
    sortBy: 'happenedAt',
    sortOrder: 'desc' as const,
  };
  const result = await attendanceService.queryBoard(filters).catch(() => ({
    filters,
    metrics: [],
    absentStudents: [{ name: '当前无法获取应到名单', detail: 'roster 接口尚未开放，且本次未取到 attendance/events 返回。' }],
    abnormalRecords: [{ name: '出勤数据暂不可用', detail: '已保留页面结构，避免 SSR 直接失败。' }],
    eventTimeline: [],
    latestEvents: [],
    actionNotice: '当前未取到 attendance/events 数据，可稍后刷新重试。',
  }));

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="出勤看板" permissionCode={attendancePermissions.boardView} />}>
      <div className="stack">
        <PageHeader
          title="出勤看板"
          description={`当前展示 attendance/events 真实数据看板。query key: ${JSON.stringify(queryKeys.attendanceBoard(filters))}`}
          actions={<><button className="btn primary">手动补签到</button><button className="btn">修正事件备注</button><button className="btn">导出今日异常</button></>}
        />

        <MetricGrid items={result.metrics} />

        <FilterBar fields={[
          { label: '校区', value: currentUser.campusIds.length ? '当前账号首个可见校区' : '全部校区', kind: 'select' },
          { label: '日期', value: today },
          { label: '事件类型', value: '全部事件', kind: 'select' },
        ]} />

        <div className="grid-2">
          <SummaryPanel title="未签到名单" items={result.absentStudents} />
          <SummaryPanel title="异常状态块" items={result.abnormalRecords} />
        </div>

        <TimelinePanel title="最近事件流" items={result.eventTimeline} />
        <section className="panel stack">
          <div className="page-header">
            <div>
              <h3>动作与异常闭环</h3>
              <p>能接真事件流的先接，缺 roster 和异常工作流的地方就明说。</p>
            </div>
            <span className="badge">real events / partial board</span>
          </div>
          <SummaryPanel
            title="联调说明"
            items={[
              { name: '事件写入', detail: 'POST /attendance/events 真接口已存在，含幂等去重。' },
              { name: '异常修正', detail: result.actionNotice },
              { name: '页面状态', detail: '页面在服务异常时会降级展示说明，不再直接返回 SSR 500。' },
            ]}
          />
        </section>
      </div>
    </PermissionGuard>
  );
}
