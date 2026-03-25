import { DataTable, FilterBar, PageHeader, SummaryPanel, TabStrip } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { attendancePermissions } from '@/features/attendance/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { attendanceService } from '@/services/attendance-service';

export default async function AttendanceDevicesPage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, attendancePermissions.devicesView);
  const deviceFilters = {
    pageNo: 1,
    pageSize: 20,
    campusId: currentUser.campusIds[0],
    tab: 'devices' as const,
    deviceType: 'all',
    status: 'all',
    sortBy: 'deviceSn',
    sortOrder: 'asc' as const,
  };
  const devices = await attendanceService.queryDevices(deviceFilters).catch(() => ({
    list: [],
    page: { pageNo: 1, pageSize: 20, total: 0 },
  }));
  const currentBindings = await attendanceService.queryCurrentBindings({ pageNo: 1, pageSize: 20, tab: 'current-bindings' }).catch(() => ({
    list: [],
    page: { pageNo: 1, pageSize: 20, total: 0 },
  }));
  const bindingHistory = await attendanceService.queryBindingHistory({ pageNo: 1, pageSize: 20, tab: 'binding-history' }).catch(() => ({
    list: [],
    page: { pageNo: 1, pageSize: 20, total: 0 },
  }));
  const action = attendanceService.actionBinding();

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="设备与绑定" permissionCode={attendancePermissions.devicesView} />}>
      <div className="stack">
        <PageHeader
          title="设备与绑定"
          description={`当前展示 attendance/devices 与 bindings 真实数据。query key: ${JSON.stringify(queryKeys.attendanceDevices(deviceFilters))}`}
          actions={<><button className="btn primary">新增设备</button><button className="btn">绑定学生</button><button className="btn">解绑设备</button></>}
        />

        <TabStrip tabs={['设备列表', '当前绑定', '历史绑定']} active="设备列表" />

        <FilterBar fields={[
          { label: '校区', value: currentUser.campusIds.length ? '当前账号首个可见校区' : '全部校区', kind: 'select' },
          { label: '设备类型', value: '全部类型', kind: 'select' },
          { label: '状态', value: '全部状态', kind: 'select' },
          { label: '关键词', value: 'SN / 学生姓名' },
        ]} />

        <DataTable
          title="设备列表"
          columns={['SN', '类型', '校区', '当前绑定学生', '状态', '绑定动作']}
          rows={devices.list.map((item) => [item.deviceSn, item.deviceType, item.campusName, item.currentStudentName, item.status, item.actionHint])}
        />

        <div className="grid-2">
          <DataTable
            title="当前绑定"
            columns={['绑定ID', 'SN', '学生', '开始时间', '结束时间', '状态']}
            rows={currentBindings.list.map((item) => [item.bindingId, item.deviceSn, item.studentName, item.startedAt, item.endedAt, item.status])}
          />
          <DataTable
            title="历史绑定"
            columns={['绑定ID', 'SN', '学生', '开始时间', '结束时间', '状态']}
            rows={bindingHistory.list.map((item) => [item.bindingId, item.deviceSn, item.studentName, item.startedAt, item.endedAt, item.status])}
          />
        </div>

        <div className="grid-2">
          <SummaryPanel
            title="绑定动作约定"
            items={[
              { name: 'bind permission', detail: action.bindPermission },
              { name: 'unbind permission', detail: action.unbindPermission },
              { name: 'service 分层', detail: action.note },
            ]}
          />
          <SummaryPanel
            title="页面说明"
            items={[
              { name: '降级策略', detail: '当设备或绑定接口暂时不可用时，页面保留空表格与说明，不直接 SSR 失败。' },
            ]}
          />
        </div>
      </div>
    </PermissionGuard>
  );
}
