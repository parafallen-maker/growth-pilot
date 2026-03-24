import type { PageResult, QueryBase } from '@/features/shared/types';

export type AttendanceBoardQuery = QueryBase & {
  date?: string;
  eventType?: string;
};

export type AttendanceDeviceQuery = QueryBase & {
  tab?: 'devices' | 'current-bindings' | 'binding-history';
  deviceType?: string;
};

export type HomeworkTimeQuery = QueryBase & {
  studentId?: string;
  subject?: string;
  dateFrom?: string;
  dateTo?: string;
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

const attendanceEvents: AttendanceEventItem[] = [
  { eventId: 'EVT-20260324-001', studentName: '张小北', eventType: 'sign-in', happenedAt: '2026-03-24 08:02', campusName: '贵阳主校区', status: '正常', note: '设备自动签到' },
  { eventId: 'EVT-20260324-014', studentName: '林一诺', eventType: 'late', happenedAt: '2026-03-24 08:37', campusName: '南明校区', status: '异常', note: '迟到 22 分钟，待前台备注' },
  { eventId: 'EVT-20260324-022', studentName: '赵安安', eventType: 'manual-fix', happenedAt: '2026-03-24 09:05', campusName: '观山湖校区', status: '补录', note: '家长临时送达，前台补签到' },
];

const devices: DeviceItem[] = [
  { deviceSn: 'SN-ATT-001', deviceType: '手环', campusName: '贵阳主校区', currentStudentName: '张小北', status: 'online', actionHint: '可解绑 / 更换学生' },
  { deviceSn: 'SN-ATT-019', deviceType: '卡片', campusName: '南明校区', currentStudentName: '林一诺', status: 'offline', actionHint: '检查电量 / 重新绑定' },
  { deviceSn: 'SN-ATT-025', deviceType: '手环', campusName: '观山湖校区', currentStudentName: '--', status: 'idle', actionHint: '可直接绑定学生' },
];

const currentBindings: BindingItem[] = [
  { bindingId: 'BIND-9001', deviceSn: 'SN-ATT-001', studentName: '张小北', startedAt: '2026-02-10 09:00', endedAt: '--', status: '当前绑定' },
  { bindingId: 'BIND-9002', deviceSn: 'SN-ATT-019', studentName: '林一诺', startedAt: '2026-03-01 10:15', endedAt: '--', status: '当前绑定' },
];

const bindingHistory: BindingItem[] = [
  { bindingId: 'BIND-8810', deviceSn: 'SN-ATT-008', studentName: '赵安安', startedAt: '2025-12-10 08:30', endedAt: '2026-01-20 18:00', status: '已解绑' },
  { bindingId: 'BIND-8842', deviceSn: 'SN-ATT-014', studentName: '陈启元', startedAt: '2026-01-05 09:10', endedAt: '2026-02-28 17:40', status: '已换绑' },
];

const homeworkTimeRows: HomeworkTimeItem[] = [
  { recordId: 'HT-001', studentName: '张小北', date: '2026-03-24', subject: '数学', totalMinutes: '85', sessionCount: '2', exceptionFlag: '正常' },
  { recordId: 'HT-002', studentName: '林一诺', date: '2026-03-24', subject: '英语', totalMinutes: '55', sessionCount: '1', exceptionFlag: '偏低' },
  { recordId: 'HT-003', studentName: '赵安安', date: '2026-03-23', subject: '语文', totalMinutes: '102', sessionCount: '3', exceptionFlag: '正常' },
];

export const attendanceService = {
  queryBoard(params: AttendanceBoardQuery = {}) {
    return {
      filters: params,
      metrics: [
        { label: '今日已签到', value: '182', hint: '较昨日 +12' },
        { label: '未签到', value: '17', hint: '按校区/日期可钻取' },
        { label: '异常签到', value: '6', hint: '迟到/重复/手动修正' },
        { label: '最近 1h 事件', value: '29', hint: '事件流滚动占位' },
      ],
      absentStudents: [
        { name: '周奕辰', detail: '贵阳主校区 · 数学班 · 待联系家长' },
        { name: '何沐言', detail: '南明校区 · 英语班 · 预计迟到' },
        { name: '许嘉禾', detail: '观山湖校区 · 尚无设备事件' },
      ],
      abnormalRecords: [
        { name: '迟到告警', detail: '林一诺 · 08:37 入场 · 超时 22 分钟' },
        { name: '重复刷卡', detail: '陈启元 · 08:05 / 08:06 连续触发' },
        { name: '人工补录', detail: '赵安安 · 前台补签到待备注闭环' },
      ],
      eventTimeline: attendanceEvents.map((item) => ({ title: `${item.happenedAt} · ${item.studentName} · ${item.eventType}`, detail: `${item.campusName} · ${item.status} · ${item.note}` })),
      latestEvents: attendanceEvents,
      actionNotice: '保留 POST /attendance/events 手动补签到、备注修正与去重说明位。',
    };
  },
  queryDevices(params: AttendanceDeviceQuery = {}): PageResult<DeviceItem> {
    return {
      list: devices,
      page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: devices.length },
    };
  },
  queryCurrentBindings(params: AttendanceDeviceQuery = {}): PageResult<BindingItem> {
    return {
      list: currentBindings,
      page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: currentBindings.length },
    };
  },
  queryBindingHistory(params: AttendanceDeviceQuery = {}): PageResult<BindingItem> {
    return {
      list: bindingHistory,
      page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: bindingHistory.length },
    };
  },
  actionBinding() {
    return {
      bindPermission: 'attendance:devices:manage',
      unbindPermission: 'attendance:devices:manage',
      note: '绑定/解绑动作统一走 service.action，后续接 POST /attendance/devices/bindings。',
    };
  },
  queryHomeworkTime(params: HomeworkTimeQuery = {}): PageResult<HomeworkTimeItem> {
    return {
      list: homeworkTimeRows,
      page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: homeworkTimeRows.length },
    };
  },
  detailHomeworkTime() {
    return {
      stats: [
        { name: '日统计', detail: '今日总时长 11.8h / 人均 71 分钟' },
        { name: '趋势图', detail: '支持按日/周切换，暂无真实 ECharts 数据源时用占位卡' },
        { name: '学科分布', detail: '数学 41% / 英语 28% / 语文 19%' },
        { name: '学生排行', detail: '张小北 85min / 赵安安 102min / 陈启元 76min' },
      ],
      exceptions: [
        { name: '偏低提醒', detail: '林一诺 · 英语作业仅 55 分钟' },
        { name: '断点会话', detail: '陈启元 · 3 次短会话待识别是否碎片化' },
      ],
    };
  },
};
