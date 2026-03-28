import { FilterBar, MetricGrid, PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { attendancePermissions } from '@/features/attendance/constants';
import { queryKeys } from '@/features/shared/query-keys';
import type { PageResult } from '@/lib/api-client';
import { requireCurrentUser } from '@/lib/current-user';
import { serverApiRequest } from '@/lib/server-api';
import { attendanceService } from '@/services/attendance-service';
import { createAttendanceBoardEvent } from './actions';

export default async function AttendanceBoardPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; replayed?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
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
  const [result, students, devices] = await Promise.all([
    attendanceService.queryBoard(filters).catch(() => ({
      filters,
      metrics: [],
      absentStudents: [{ name: '当前无法获取应到名单', detail: 'roster 接口尚未开放，且本次未取到 attendance/events 返回。' }],
      abnormalRecords: [{ name: '出勤数据暂不可用', detail: '已保留页面结构，避免 SSR 直接失败。' }],
      eventTimeline: [],
      latestEvents: [],
      actionNotice: '当前未取到 attendance/events 数据，可稍后刷新重试。',
    })),
    serverApiRequest<PageResult<{ id: string; name: string; studentNo: string }>>('/students?pageNo=1&pageSize=50').catch(() => ({ list: [], page: { pageNo: 1, pageSize: 50, total: 0 } })),
    serverApiRequest<PageResult<{ id: string; serialNo: string }>>('/attendance/devices?pageNo=1&pageSize=50').catch(() => ({ list: [], page: { pageNo: 1, pageSize: 50, total: 0 } })),
  ]);

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="出勤看板" permissionCode={attendancePermissions.boardView} />}>
      <div className="stack">
        <PageHeader
          title="出勤看板"
          description="今日校区考勤数据概览"
          actions={<><a className="btn primary" href="#attendance-event-create-form">手动补签到</a><button className="btn">修正事件备注</button><button className="btn">导出今日异常</button></>}
        />
        {query?.created ? <section className="panel"><div className="badge success">{query.replayed === '1' ? '事件幂等重放成功' : '出勤事件已创建'}：{query.created}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}

        <MetricGrid items={result.metrics} />

        <section className="panel stack" id="attendance-event-create-form">
          <div className="page-header">
            <div>
              <h3>手动录入出勤事件</h3>
              <p>当前表单直连 POST /attendance/events；roster 缺口仍明确保留，但补录动作不再是假按钮。</p>
            </div>
            <span className="badge success">POST /attendance/events</span>
          </div>
          <form className="form-grid" action={createAttendanceBoardEvent}>
            <div className="field"><label>学生</label><select className="select" name="studentId" defaultValue={students.list[0]?.id ?? ''} required>{students.list.length ? students.list.map((student) => <option key={student.id} value={student.id}>{student.name} / {student.studentNo}</option>) : <option value="">暂无学生</option>}</select></div>
            <div className="field"><label>校区 ID</label><input className="input" name="campusId" placeholder={currentUser.campusIds[0] ?? 'campus-001'} defaultValue={currentUser.campusIds[0] ?? ''} required /></div>
            <div className="field"><label>设备（可选）</label><select className="select" name="deviceId" defaultValue=""><option value="">手动录入，无设备</option>{devices.list.map((device) => <option key={device.id} value={device.id}>{device.serialNo}</option>)}</select></div>
            <div className="field"><label>事件类型</label><select className="select" name="eventType" defaultValue="checkin"><option value="checkin">checkin</option><option value="checkout">checkout</option><option value="manual_checkin">manual_checkin</option><option value="manual_checkout">manual_checkout</option></select></div>
            <div className="field"><label>事件时间</label><input className="input" type="datetime-local" name="eventTime" required /></div>
            <div className="field form-span-2"><label>备注</label><textarea className="textarea" name="remark" placeholder="补录原因、异常说明、家长请假备注等" /></div>
            <div className="button-row form-span-2"><button className="btn primary" type="submit" disabled={!students.list.length || !currentUser.campusIds[0]}>创建事件</button></div>
          </form>
        </section>

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
