import { DataTable, FilterBar, MetricGrid, PageHeader, StateBlock, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { attendancePermissions } from '@/features/attendance/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { mockCurrentUser } from '@/lib/navigation';
import { attendanceService } from '@/services/attendance-service';

export default function AttendanceHomeworkTimePage() {
  const allowed = hasPermission(mockCurrentUser.permissions, attendancePermissions.homeworkTimeView);
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
  const result = attendanceService.queryHomeworkTime(filters);
  const detail = attendanceService.detailHomeworkTime();

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="作业时长" permissionCode={attendancePermissions.homeworkTimeView} />}>
      <div className="stack">
        <PageHeader
          title="作业时长骨架"
          description={`P19 已铺筛选栏、日统计、趋势图占位、学科分布与学生排行块。query key: ${JSON.stringify(queryKeys.attendanceHomeworkTime(filters))}`}
          actions={<><button className="btn primary">导出统计</button><button className="btn">查看异常会话</button></>}
        />

        <MetricGrid
          items={[
            { label: '今日总分钟', value: '708', hint: '按校区 / 日期汇总' },
            { label: '人均投入', value: '71min', hint: '和近 7 日均值对比' },
            { label: '异常学生', value: '4', hint: '偏低 / 断点 / 异常长时段' },
            { label: '有效会话', value: '32', hint: '后续接日聚合任务' },
          ]}
        />

        <FilterBar fields={[
          { label: '校区', value: '贵阳主校区', kind: 'select' },
          { label: '学生', value: '全部学生', kind: 'select' },
          { label: '学科', value: '全部学科', kind: 'select' },
          { label: '开始日期', value: '2026-03-18' },
          { label: '结束日期', value: '2026-03-24' },
        ]} />

        <div className="grid-2">
          <SummaryPanel title="日统计 / 趋势图占位" items={detail.stats.slice(0, 2)} />
          <SummaryPanel title="学科分布 / 学生排行占位" items={detail.stats.slice(2)} />
        </div>

        <div className="grid-2">
          <SummaryPanel title="异常状态块" items={detail.exceptions} />
          <StateBlock state="loading" title="趋势图 loading" />
        </div>

        <DataTable
          title="作业时长列表"
          columns={['学生', '日期', '学科', '总分钟', '会话数', '异常标记']}
          rows={result.list.map((item) => [item.studentName, item.date, item.subject, item.totalMinutes, item.sessionCount, item.exceptionFlag])}
        />

        <div className="grid-2">
          <StateBlock state="empty" title="筛选后无统计记录" />
          <StateBlock state="error" title="日聚合查询失败" actionLabel="重跑聚合 / 重试" />
        </div>
      </div>
    </PermissionGuard>
  );
}
