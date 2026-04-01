import type { PageResult } from '@/lib/api-client';
import type { QueryBase } from '@/features/shared/types';
import { serverApiRequest } from '@/lib/server-api';

export type AttendanceBoardQuery = QueryBase & {
  date?: string;
  eventType?: string;
};

export type AttendanceDeviceQuery = QueryBase & {
  tab?: 'devices' | 'current-bindings' | 'binding-history';
  deviceType?: string;
  status?: string;
};

export type HomeworkTimeQuery = QueryBase & {
  studentId?: string;
  subject?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type CreateAttendanceEventPayload = {
  studentId: string;
  campusId?: string;
  deviceId?: string;
  eventType: string;
  eventTime: string;
  operatorUserId?: string;
  remark?: string;
};

export type CreateAttendanceDevicePayload = {
  campusId?: string;
  serialNo: string;
  deviceType?: string;
  status?: string;
  note?: string;
};

export type CreateDeviceBindingPayload = {
  studentId: string;
  deviceId: string;
  status?: string;
  boundAt?: string;
  createdBy?: string;
};

export type UpdateDeviceBindingPayload = {
  status?: string;
  unboundAt?: string;
};

type AttendanceEventItem = {
  eventId: string;
  studentName: string;
  eventType: string;
  happenedAt: string;
  campusName: string;
  status: string;
  note: string;
};

type DeviceItem = {
  deviceId: string;
  deviceSn: string;
  deviceType: string;
  campusName: string;
  currentStudentName: string;
  status: string;
  actionHint: string;
};

type BindingItem = {
  bindingId: string;
  deviceSn: string;
  studentName: string;
  startedAt: string;
  endedAt: string;
  status: string;
};

type HomeworkTimeItem = {
  recordId: string;
  studentName: string;
  date: string;
  subject: string;
  totalMinutes: string;
  sessionCount: string;
  exceptionFlag: string;
};

const deviceTypeMap: Record<string, string> = {
  beacon: '手环',
  tablet: '平板',
  gate: '闸机',
  manual: '手工设备',
};

const eventTypeMap: Record<string, string> = {
  checkin: '签到',
  checkout: '签退',
  manual_checkin: '手动签到',
  manual_checkout: '手动签退',
  late: '迟到',
  'manual-fix': '手动修正',
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

function formatAt(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '--';
}

function toStudentName(studentId: string | null | undefined, studentNameById: Map<string, string>) {
  return studentId ? studentNameById.get(studentId) ?? studentId : '--';
}

function toCampusName(campusId: string | null | undefined, campusNameById: Map<string, string>) {
  return campusId ? campusNameById.get(campusId) ?? campusId : '--';
}

function toDeviceTypeName(deviceType?: string | null) {
  return deviceType ? deviceTypeMap[deviceType] ?? deviceType : '--';
}

function toEventTypeName(eventType?: string | null) {
  return eventType ? eventTypeMap[eventType] ?? eventType : '--';
}

function toEventStatus(item: { eventType: string; remark?: string | null }) {
  if (item.eventType === 'late') return '异常';
  if (item.eventType.startsWith('manual_')) return '补录';
  if (item.remark?.includes('补')) return '补录';
  return '正常';
}

function toExceptionFlag(totalMinutes: number) {
  if (totalMinutes < 60) return '偏低';
  if (totalMinutes > 120) return '偏高';
  return '正常';
}

async function fetchStudentNameById() {
  const result = await serverApiRequest<PageResult<{ id: string; name: string }>>('/students?pageNo=1&pageSize=200');
  return new Map(result.list.map((item) => [item.id, item.name]));
}

async function fetchCampusNameById() {
  const result = await serverApiRequest<PageResult<{ id: string; name: string }>>('/settings/campuses?pageNo=1&pageSize=200');
  return new Map(result.list.map((item) => [item.id, item.name]));
}

export const attendanceService = {
  async queryBoard(params: AttendanceBoardQuery = {}) {
    const { date, ...query } = params;
    const [result, studentNameById, campusNameById] = await Promise.all([
      serverApiRequest<PageResult<{
        id: string;
        studentId: string;
        campusId?: string | null;
        eventType: string;
        eventTime: string;
        remark?: string | null;
      }>>(`/attendance/events${buildQuery({ ...query, dateFrom: date, dateTo: date })}`),
      fetchStudentNameById(),
      fetchCampusNameById(),
    ]);

    const latestEvents: AttendanceEventItem[] = result.list.map((item) => ({
      eventId: item.id,
      studentName: toStudentName(item.studentId, studentNameById),
      eventType: toEventTypeName(item.eventType),
      happenedAt: formatAt(item.eventTime),
      campusName: toCampusName(item.campusId, campusNameById),
      status: toEventStatus(item),
      note: item.remark ?? '设备自动写入',
    }));

    const abnormalEvents = latestEvents.filter((item) => item.status !== '正常');
    const normalCheckins = result.list.filter((item) => item.eventType === 'checkin' || item.eventType === 'manual_checkin').length;
    const latestEventTime = result.list.reduce<number | null>((latest, item) => {
      const timestamp = Date.parse(item.eventTime);
      if (Number.isNaN(timestamp)) return latest;
      return latest === null || timestamp > latest ? timestamp : latest;
    }, null);
    const recentHourCount = latestEventTime === null
      ? 0
      : result.list.filter((item) => {
        const timestamp = Date.parse(item.eventTime);
        return !Number.isNaN(timestamp) && latestEventTime - timestamp <= 60 * 60 * 1000;
      }).length;

    return {
      filters: params,
      metrics: [
        { label: '今日事件', value: String(result.page.total), hint: '当前筛选窗口事件总数' },
        { label: '签到数', value: String(normalCheckins), hint: '按当天 checkin 事件统计' },
        { label: '异常事件', value: String(abnormalEvents.length), hint: '迟到 / 补录 / 其他异常' },
        { label: '最近 1h 事件', value: String(recentHourCount), hint: '按最新事件时间向前 1 小时窗口统计' },
      ],
      absentStudents: result.page.total
        ? [{ name: '应到名单缺口', detail: '后端仍未提供 roster/应到名单接口，无法计算真正未签到名单。' }]
        : [{ name: '暂无当日事件', detail: '当前筛选下未返回事件。' }],
      abnormalRecords: abnormalEvents.length
        ? abnormalEvents.map((item) => ({ name: item.eventType, detail: `${item.studentName} · ${item.happenedAt} · ${item.note}` }))
        : [{ name: '暂无异常', detail: '当前筛选条件下未命中异常事件。' }],
      eventTimeline: latestEvents.map((item) => ({ title: `${item.happenedAt} · ${item.studentName} · ${item.eventType}`, detail: `${item.campusName} · ${item.status} · ${item.note}` })),
      latestEvents,
    };
  },

  async queryDevices(params: AttendanceDeviceQuery = {}): Promise<PageResult<DeviceItem>> {
    const { tab: _tab, ...query } = params;
    const [devices, bindings, studentNameById, campusNameById] = await Promise.all([
      serverApiRequest<PageResult<{ id: string; serialNo: string; deviceType: string; campusId?: string | null; status: string }>>(`/attendance/devices${buildQuery(query)}`),
      serverApiRequest<PageResult<{ deviceId: string; studentId: string; status: string }>>(`/attendance/devices/bindings${buildQuery({ pageNo: 1, pageSize: 200, status: 'active' })}`),
      fetchStudentNameById(),
      fetchCampusNameById(),
    ]);
    const activeBindingByDevice = new Map(bindings.list.map((item) => [item.deviceId, item]));

    return {
      ...devices,
      list: devices.list.map((item) => ({
        deviceId: item.id,
        deviceSn: item.serialNo,
        deviceType: toDeviceTypeName(item.deviceType),
        campusName: toCampusName(item.campusId, campusNameById),
        currentStudentName: toStudentName(activeBindingByDevice.get(item.id)?.studentId, studentNameById),
        status: item.status,
        actionHint: item.status === 'bound' ? '可解绑 / 更换学生' : '可直接绑定学生',
      })),
    };
  },

  async createDevice(payload: CreateAttendanceDevicePayload) {
    return serverApiRequest<{ id: string; serialNo: string; status: string }>(`/attendance/devices`, {
      method: 'POST',
      body: payload,
    });
  },

  async queryCurrentBindings(params: AttendanceDeviceQuery = {}): Promise<PageResult<BindingItem>> {
    const { tab: _tab, ...query } = params;
    const [bindings, devices, studentNameById] = await Promise.all([
      serverApiRequest<PageResult<{ id: string; deviceId: string; studentId: string; boundAt: string; unboundAt?: string | null; status: string }>>(`/attendance/devices/bindings${buildQuery({ ...query, status: 'active' })}`),
      serverApiRequest<PageResult<{ id: string; serialNo: string }>>('/attendance/devices?pageNo=1&pageSize=200'),
      fetchStudentNameById(),
    ]);
    const deviceSerialById = new Map(devices.list.map((item) => [item.id, item.serialNo]));

    return {
      ...bindings,
      list: bindings.list.map((item) => ({
        bindingId: item.id,
        deviceSn: deviceSerialById.get(item.deviceId) ?? item.deviceId,
        studentName: toStudentName(item.studentId, studentNameById),
        startedAt: formatAt(item.boundAt),
        endedAt: '--',
        status: '当前绑定',
      })),
    };
  },

  async queryBindingHistory(params: AttendanceDeviceQuery = {}): Promise<PageResult<BindingItem>> {
    const { tab: _tab, ...query } = params;
    const [bindings, devices, studentNameById] = await Promise.all([
      serverApiRequest<PageResult<{ id: string; deviceId: string; studentId: string; boundAt: string; unboundAt?: string | null; status: string }>>(`/attendance/devices/bindings${buildQuery({ ...query, status: 'inactive' })}`),
      serverApiRequest<PageResult<{ id: string; serialNo: string }>>('/attendance/devices?pageNo=1&pageSize=200'),
      fetchStudentNameById(),
    ]);
    const deviceSerialById = new Map(devices.list.map((item) => [item.id, item.serialNo]));

    return {
      ...bindings,
      list: bindings.list.map((item) => ({
        bindingId: item.id,
        deviceSn: deviceSerialById.get(item.deviceId) ?? item.deviceId,
        studentName: toStudentName(item.studentId, studentNameById),
        startedAt: formatAt(item.boundAt),
        endedAt: formatAt(item.unboundAt),
        status: '已解绑',
      })),
    };
  },

  async createBinding(payload: CreateDeviceBindingPayload) {
    return serverApiRequest<{ id: string; studentId: string; deviceId: string; status: string }>(`/attendance/devices/bindings`, {
      method: 'POST',
      body: payload,
    });
  },

  async updateBinding(bindingId: string, payload: UpdateDeviceBindingPayload) {
    return serverApiRequest<{ id: string; status: string; unboundAt?: string | null }>(`/attendance/devices/bindings/${bindingId}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  actionBinding() {
    return {
      bindPermission: 'attendance:devices:manage',
      unbindPermission: 'attendance:devices:manage',
      note: '批量绑定、批量换绑工作流仍待后端补批处理接口。',
    };
  },

  async createEvent(payload: CreateAttendanceEventPayload) {
    return serverApiRequest<{ id: string; eventType: string; eventTime: string; replayed?: boolean }>(`/attendance/events`, {
      method: 'POST',
      body: payload,
    });
  },

  async queryHomeworkTime(params: HomeworkTimeQuery = {}): Promise<PageResult<HomeworkTimeItem>> {
    const [result, studentNameById] = await Promise.all([
      serverApiRequest<PageResult<{ id: string; studentId: string; statDate: string; subject: string; totalMinutes: number; sessionCount: number }>>(`/attendance/homework-time/daily-stats${buildQuery(params)}`),
      fetchStudentNameById(),
    ]);
    return {
      ...result,
      list: result.list.map((item) => ({
        recordId: item.id,
        studentName: toStudentName(item.studentId, studentNameById),
        date: item.statDate,
        subject: item.subject,
        totalMinutes: String(item.totalMinutes),
        sessionCount: String(item.sessionCount),
        exceptionFlag: toExceptionFlag(item.totalMinutes),
      })),
    };
  },

  detailHomeworkTime(result: PageResult<HomeworkTimeItem>) {
    const totalMinutes = result.list.reduce((sum, item) => sum + Number(item.totalMinutes), 0);
    const totalSessions = result.list.reduce((sum, item) => sum + Number(item.sessionCount), 0);
    const averageMinutes = result.list.length ? Math.round(totalMinutes / result.list.length) : 0;
    const subjectBreakdown = Array.from(result.list.reduce((map, item) => map.set(item.subject, (map.get(item.subject) ?? 0) + Number(item.totalMinutes)), new Map<string, number>()).entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([subject, minutes]) => ({ name: subject, detail: `${minutes} 分钟` }));
    const topStudents = [...result.list]
      .sort((a, b) => Number(b.totalMinutes) - Number(a.totalMinutes))
      .slice(0, 3)
      .map((item) => ({ name: item.studentName, detail: `${item.totalMinutes} 分钟 / ${item.sessionCount} 次` }));
    const exceptions = result.list
      .filter((item) => item.exceptionFlag !== '正常')
      .map((item) => ({ name: `${item.exceptionFlag}提醒`, detail: `${item.studentName} · ${item.subject} · ${item.totalMinutes} 分钟` }));

    return {
      metrics: [
        { label: '总分钟', value: String(totalMinutes), hint: '当前筛选记录总计' },
        { label: '人均投入', value: `${averageMinutes}min`, hint: '按当前筛选记录均值' },
        { label: '异常学生', value: String(exceptions.length), hint: '偏低 / 偏高规则先按分钟阈值' },
        { label: '有效会话', value: String(totalSessions), hint: '来自 dailyStats.sessionCount 聚合' },
      ],
      stats: [
        { name: '日统计', detail: `当前筛选总计 ${totalMinutes} 分钟 / ${totalSessions} 次会话` },
        { name: '趋势图', detail: '当前先用 daily stats 汇总做解读。' },
        { name: '学科分布', detail: subjectBreakdown.length ? subjectBreakdown.map((item) => `${item.name} ${item.detail}`).join(' / ') : '暂无数据' },
        { name: '学生排行', detail: topStudents.length ? topStudents.map((item) => `${item.name} ${item.detail}`).join(' / ') : '暂无数据' },
      ],
      exceptions: exceptions.length ? exceptions : [{ name: '暂无异常', detail: '当前筛选条件下未命中偏低/偏高记录。' }],
    };
  },
};
