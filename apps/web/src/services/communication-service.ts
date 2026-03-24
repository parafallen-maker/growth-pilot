import type { PageResult, QueryBase } from '@/features/shared/types';

export type CommunicationFilters = QueryBase & {
  familyId?: string;
  studentId?: string;
  channel?: string;
  direction?: string;
  messageStatus?: 'draft' | 'queued' | 'sent' | 'failed' | 'read';
  dateFrom?: string;
  dateTo?: string;
};

type CommunicationRecordItem = {
  occurredAt: string;
  familyName: string;
  studentName: string;
  channel: string;
  direction: string;
  subject: string;
  recorder: string;
  actions: string;
};

type MessageTemplateItem = {
  templateName: string;
  messageType: string;
  channel: string;
  lastUpdatedAt: string;
  owner: string;
  actions: string;
};

type MessageTaskItem = {
  messageId: string;
  messageType: string;
  familyName: string;
  studentName: string;
  channel: string;
  scheduledAt: string;
  status: string;
  actions: string;
};

const communicationRecords: CommunicationRecordItem[] = [
  { occurredAt: '2026-03-24 19:30', familyName: '张家', studentName: '张小北', channel: '电话', direction: '呼出', subject: '续费意向确认', recorder: '李顾问', actions: '查看详情 / 关联会谈' },
  { occurredAt: '2026-03-24 17:10', familyName: '林家', studentName: '林一诺', channel: '微信', direction: '呼入', subject: '周报补充说明', recorder: '王老师', actions: '查看详情 / 创建任务' },
  { occurredAt: '2026-03-23 20:00', familyName: '赵家', studentName: '赵安安', channel: '面谈', direction: '到店', subject: '阶段复盘会谈', recorder: '周老师', actions: '查看详情 / 新建跟进' },
];

const templates: MessageTemplateItem[] = [
  { templateName: '周报发送模板', messageType: '成长周报', channel: '企业微信', lastUpdatedAt: '2026-03-24 10:00', owner: '教务运营', actions: '编辑模板 / 复制模板' },
  { templateName: '账单提醒模板', messageType: '账单提醒', channel: '微信', lastUpdatedAt: '2026-03-23 15:20', owner: '财务组', actions: '编辑模板 / 预览发送' },
  { templateName: '家庭任务提醒模板', messageType: '任务通知', channel: '短信', lastUpdatedAt: '2026-03-22 09:15', owner: '成长顾问组', actions: '编辑模板 / 克隆模板' },
];

const drafts: MessageTaskItem[] = [
  { messageId: 'MSG-DRAFT-301', messageType: '成长周报', familyName: '张家', studentName: '张小北', channel: '企业微信', scheduledAt: '待定', status: 'draft', actions: '继续编辑 / 提交待发' },
  { messageId: 'MSG-DRAFT-302', messageType: '任务通知', familyName: '赵家', studentName: '赵安安', channel: '微信', scheduledAt: '2026-03-25 09:00', status: 'draft', actions: '继续编辑 / 删除草稿' },
];

const queued: MessageTaskItem[] = [
  { messageId: 'MSG-QUEUE-410', messageType: '账单提醒', familyName: '林家', studentName: '林一诺', channel: '微信', scheduledAt: '2026-03-25 08:30', status: 'queued', actions: '立即发送 / 取消待发' },
  { messageId: 'MSG-QUEUE-411', messageType: '成长周报', familyName: '陈家', studentName: '陈启元', channel: '企业微信', scheduledAt: '2026-03-25 19:00', status: 'queued', actions: '查看素材 / 调整时间' },
];

const sent: MessageTaskItem[] = [
  { messageId: 'MSG-SENT-501', messageType: '成长周报', familyName: '卢家', studentName: '卢南南', channel: '企业微信', scheduledAt: '2026-03-24 20:30', status: 'sent', actions: '查看回执 / 再次发送' },
  { messageId: 'MSG-SENT-502', messageType: '账单提醒', familyName: '赵家', studentName: '赵安安', channel: '微信', scheduledAt: '2026-03-24 18:00', status: 'read', actions: '查看回执 / 关联账单' },
];

const failed: MessageTaskItem[] = [
  { messageId: 'MSG-FAIL-601', messageType: '任务通知', familyName: '陈家', studentName: '陈启元', channel: '短信', scheduledAt: '2026-03-24 17:40', status: 'failed', actions: '重试失败 / 查看原因' },
  { messageId: 'MSG-FAIL-602', messageType: '账单提醒', familyName: '黄家', studentName: '黄明轩', channel: '微信', scheduledAt: '2026-03-24 16:10', status: 'failed', actions: '重试失败 / 切换渠道' },
];

export const communicationService = {
  queryRecords(params: CommunicationFilters = {}): PageResult<CommunicationRecordItem> {
    return {
      list: communicationRecords,
      page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: communicationRecords.length },
    };
  },
  detailRecord(subject: string) {
    return {
      subject,
      timeline: [
        { title: '首次接触', detail: '2026-03-20 18:30 · 微信建联，家长关注续费节奏。' },
        { title: '会谈安排', detail: '2026-03-23 20:00 · 到店面谈，确认阶段目标。' },
        { title: '本次沟通', detail: '2026-03-24 19:30 · 电话确认账单与课时衔接。' },
      ],
      linkedActions: [
        { name: '关联会谈', detail: '保留 communication -> meeting 跳转位' },
        { name: '创建家庭任务', detail: '保留沟通后续闭环动作位' },
        { name: '转消息中心', detail: '可直接生成周报 / 账单提醒草稿' },
      ],
    };
  },
  queryMessages(params: CommunicationFilters = {}) {
    return {
      filters: params,
      templates: { list: templates, page: { pageNo: 1, pageSize: 20, total: templates.length } },
      drafts: { list: drafts, page: { pageNo: 1, pageSize: 20, total: drafts.length } },
      queued: { list: queued, page: { pageNo: 1, pageSize: 20, total: queued.length } },
      sent: { list: sent, page: { pageNo: 1, pageSize: 20, total: sent.length } },
      failed: { list: failed, page: { pageNo: 1, pageSize: 20, total: failed.length } },
      statusPanels: [
        { name: '模板复用', detail: '周报 / 账单 / 任务通知共用模板入口' },
        { name: '草稿保留', detail: '未定时、待补素材消息先挂 draft' },
        { name: '发送任务', detail: 'queued -> sent / failed，保留回执状态 read' },
      ],
    };
  },
  actionMessage() {
    return {
      actions: ['创建消息', '立即发送', '重试失败', '查看回执'],
      note: '保留模板、草稿、待发、已发、失败五段状态区块，后续接真实 DTO 不改页面骨架。',
    };
  },
};
