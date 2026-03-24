import { MetricGrid, FilterBar, PageHeader, StateBlock, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { attendancePermissions } from '@/features/attendance/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { mockCurrentUser } from '@/lib/navigation';
import { attendanceService } from '@/services/attendance-service';

export default function AttendanceBoardPage() {
  const allowed = hasPermission(mockCurrentUser.permissions, attendancePermissions.boardView);
  const filters = {
    pageNo: 1,
    pageSize: 20,
    campusId: 'campus-guiyang',
    date: '2026-03-24',
    eventType: 'all',
    sortBy: 'happenedAt',
    sortOrder: 'desc' as const,
  };
  const result = attendanceService.queryBoard(filters);

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="出勤看板" permissionCode={attendancePermissions.boardView} />}>
      <div className="stack">
        <PageHeader
          title="出勤看板骨架"
          description={`P17 已铺签到 KPI、未签到名单、异常状态块、事件流与动作位。query key: ${JSON.stringify(queryKeys.attendanceBoard(filters))}`}
          actions={<><button className="btn primary">手动补签到</button><button className="btn">修正事件备注</button><button className="btn">导出今日异常</button></>}
        />

        <MetricGrid items={result.metrics} />

        <FilterBar fields={[
          { label: '校区', value: '贵阳主校区', kind: 'select' },
          { label: '日期', value: '2026-03-24' },
          { label: '事件类型', value: '全部事件', kind: 'select' },
        ]} />

        <div className="grid-2">
          <SummaryPanel title="未签到名单" items={result.absentStudents} />
          <SummaryPanel title="异常状态块" items={result.abnormalRecords} />
        </div>

        <TimelinePanel title="最近事件流" items={result.eventTimeline} />

        <div className="grid-3">
          <StateBlock state="loading" title="看板 loading" />
          <StateBlock state="empty" title="今日无事件" />
          <StateBlock state="error" title="看板读取失败" actionLabel="重试事件查询" />
        </div>

        <section className="panel stack">
          <div className="page-header">
            <div>
              <h3>动作与异常闭环</h3>
              <p>给前台和校区管理员留出补签到、备注修正、异常去重说明位。</p>
            </div>
            <span className="badge">service.action placeholder</span>
          </div>
          <SummaryPanel
            title="联调说明"
            items={[
              { name: '事件写入', detail: 'POST /attendance/events，后端需完成三元组去重。' },
              { name: '异常修正', detail: result.actionNotice },
              { name: '页面状态', detail: 'loading / empty / error / permissionDenied 已放齐。' },
            ]}
          />
        </section>
      </div>
    </PermissionGuard>
  );
}
