import { DataTable, FilterBar, PageHeader, SummaryPanel, TabStrip } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { attendancePermissions } from '@/features/attendance/constants';
import { queryKeys } from '@/features/shared/query-keys';
import type { PageResult } from '@/lib/api-client';
import { requireCurrentUser } from '@/lib/current-user';
import { serverApiRequest } from '@/lib/server-api';
import { attendanceService } from '@/services/attendance-service';
import { createAttendanceBinding, createAttendanceDevice, updateAttendanceBinding } from './actions';

export default async function AttendanceDevicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ deviceCreated?: string; bindingCreated?: string; bindingUpdated?: string; status?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
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
  const students = await serverApiRequest<PageResult<{ id: string; name: string; studentNo: string }>>('/students?pageNo=1&pageSize=50').catch(() => ({
    list: [],
    page: { pageNo: 1, pageSize: 50, total: 0 },
  }));
  const action = attendanceService.actionBinding();

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="设备与绑定" permissionCode={attendancePermissions.devicesView} />}>
      <div className="stack">
        <PageHeader
          title="设备与绑定"
          description={`当前展示 attendance/devices 与 bindings 真实数据。query key: ${JSON.stringify(queryKeys.attendanceDevices(deviceFilters))}`}
          actions={<><a className="btn primary" href="#attendance-device-create-form">新增设备</a><a className="btn" href="#attendance-binding-create-form">绑定学生</a><a className="btn" href="#attendance-binding-update-form">解绑设备</a></>}
        />
        {query?.deviceCreated ? <section className="panel"><div className="badge success">设备已创建：{query.deviceCreated}{query.status ? ` / status=${query.status}` : ''}</div></section> : null}
        {query?.bindingCreated ? <section className="panel"><div className="badge success">绑定已创建：{query.bindingCreated}{query.status ? ` / status=${query.status}` : ''}</div></section> : null}
        {query?.bindingUpdated ? <section className="panel"><div className="badge success">绑定已更新：{query.bindingUpdated}{query.status ? ` / status=${query.status}` : ''}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}

        <TabStrip tabs={['设备列表', '当前绑定', '历史绑定']} active="设备列表" />

        <div className="grid-2">
          <section className="panel stack" id="attendance-device-create-form">
            <div className="page-header">
              <div>
                <h3>新增设备</h3>
                <p>当前表单直连 POST /attendance/devices。</p>
              </div>
              <span className="badge success">POST /attendance/devices</span>
            </div>
            <form className="form-grid" action={createAttendanceDevice}>
              <div className="field"><label>设备 SN</label><input className="input" name="serialNo" placeholder="DEV-202603-001" required /></div>
              <div className="field"><label>设备类型</label><select className="select" name="deviceType" defaultValue="beacon"><option value="beacon">beacon</option><option value="tablet">tablet</option><option value="gate">gate</option><option value="manual">manual</option></select></div>
              <div className="field"><label>校区 ID（可选）</label><input className="input" name="campusId" placeholder={currentUser.campusIds[0] ?? 'campus-001'} defaultValue={currentUser.campusIds[0] ?? ''} /></div>
              <div className="field"><label>状态</label><select className="select" name="status" defaultValue="idle"><option value="idle">idle</option><option value="bound">bound</option><option value="repair">repair</option><option value="retired">retired</option></select></div>
              <div className="field form-span-2"><label>备注</label><textarea className="textarea" name="note" placeholder="设备来源、班级归属、硬件状态等" /></div>
              <div className="button-row form-span-2"><button className="btn primary" type="submit">创建设备</button></div>
            </form>
          </section>
          <section className="panel stack" id="attendance-binding-create-form">
            <div className="page-header">
              <div>
                <h3>创建设备绑定</h3>
                <p>当前表单直连 POST /attendance/devices/bindings。</p>
              </div>
              <span className="badge success">POST /attendance/devices/bindings</span>
            </div>
            <form className="form-grid" action={createAttendanceBinding}>
              <div className="field"><label>设备</label><select className="select" name="deviceId" defaultValue={devices.list[0]?.deviceId ?? ''} required>{devices.list.length ? devices.list.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.deviceSn} / {device.deviceType} / {device.status}</option>) : <option value="">暂无设备</option>}</select></div>
              <div className="field"><label>学生</label><select className="select" name="studentId" defaultValue={students.list[0]?.id ?? ''} required>{students.list.length ? students.list.map((student) => <option key={student.id} value={student.id}>{student.name} / {student.studentNo}</option>) : <option value="">暂无学生</option>}</select></div>
              <div className="field"><label>绑定状态</label><select className="select" name="status" defaultValue="active"><option value="active">active</option><option value="inactive">inactive</option></select></div>
              <div className="field"><label>绑定时间</label><input className="input" type="datetime-local" name="boundAt" /></div>
              <div className="button-row form-span-2"><button className="btn primary" type="submit" disabled={!devices.list.length || !students.list.length}>创建绑定</button></div>
            </form>
          </section>
        </div>

        <section className="panel stack" id="attendance-binding-update-form">
          <div className="page-header">
            <div>
              <h3>更新 / 解绑当前绑定</h3>
              <p>当前解绑动作走 PATCH /attendance/devices/bindings/{'{id}'}。</p>
            </div>
            <span className="badge">PATCH binding</span>
          </div>
          <form className="form-grid" action={updateAttendanceBinding}>
            <div className="field form-span-2"><label>绑定记录</label><select className="select" name="bindingId" defaultValue={currentBindings.list[0]?.bindingId ?? ''} required>{currentBindings.list.length ? currentBindings.list.map((binding) => <option key={binding.bindingId} value={binding.bindingId}>{binding.deviceSn} / {binding.studentName} / {binding.status}</option>) : <option value="">暂无当前绑定</option>}</select></div>
            <div className="field"><label>目标状态</label><select className="select" name="status" defaultValue="inactive"><option value="inactive">inactive</option><option value="active">active</option></select></div>
            <div className="field"><label>解绑时间</label><input className="input" type="datetime-local" name="unboundAt" /></div>
            <div className="button-row form-span-2"><button className="btn primary" type="submit" disabled={!currentBindings.list.length}>更新绑定</button></div>
          </form>
        </section>

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
