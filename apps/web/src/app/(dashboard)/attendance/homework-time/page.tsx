import { DataTable, FilterBar, MetricGrid, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { attendancePermissions } from '@/features/attendance/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { attendanceService } from '@/services/attendance-service';

export default async function AttendanceHomeworkTimePage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, attendancePermissions.homeworkTimeView);
  const filters = {
    pageNo: 1,
    pageSize: 20,
    campusId: 'campus-guiyang',
    studentId: 'all',
    subject: 'all',
    dateFrom: '2026-03-18',
    dateTo: '2026-03-24',
    sortBy: 'date',
    sortOrder: 'desc' as const,
  };
  const result = await attendanceService.queryHomeworkTime(filters).catch(() => ({
    list: [],
    page: { pageNo: 1, pageSize: 20, total: 0 },
  }));
  const detail = attendanceService.detailHomeworkTime(result);

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="作业时长" permissionCode={attendancePermissions.homeworkTimeView} />}>
      <div className="stack">
        <PageHeader
          title="作业时长"
          description={`当前展示 attendance/homework-time/daily-stats 真实统计结果。query key: ${JSON.stringify(queryKeys.attendanceHomeworkTime(filters))}`}
          actions={<><button className="btn primary">导出统计</button><button className="btn">查看异常会话</button></>}
        />

        <MetricGrid items={detail.metrics} />

        <FilterBar fields={[
          { label: '校区', value: '贵阳主校区', kind: 'select' },
          { label: '学生', value: '全部学生', kind: 'select' },
          { label: '学科', value: '全部学科', kind: 'select' },
          { label: '开始日期', value: '2026-03-18' },
          { label: '结束日期', value: '2026-03-24' },
        ]} />

        <div className="grid-2">
          <SummaryPanel title="日统计 / 趋势解读" items={detail.stats.slice(0, 2)} />
          <SummaryPanel title="学科分布 / 学生排行" items={detail.stats.slice(2)} />
        </div>

        <div className="grid-2">
          <SummaryPanel title="异常状态" items={detail.exceptions} />
          <SummaryPanel title="数据说明" items={[{ name: '趋势序列', detail: '专用时间序列接口尚未开放，当前先展示真实日统计汇总。' }]} />
        </div>

        <DataTable
          title="作业时长列表"
          columns={['学生', '日期', '学科', '总分钟', '会话数', '异常标记']}
          rows={result.list.map((item) => [item.studentName, item.date, item.subject, item.totalMinutes, item.sessionCount, item.exceptionFlag])}
        />
      </div>
    </PermissionGuard>
  );
}
