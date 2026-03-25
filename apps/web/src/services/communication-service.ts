import { apiRequest, type PageResult } from '@/lib/api-client';
import type { QueryBase } from '@/features/shared/types';

export type CommunicationFilters = QueryBase & {
  familyId?: string;
  studentId?: string;
  channel?: string;
  direction?: string;
  messageStatus?: 'draft' | 'pending' | 'sent' | 'failed' | 'read';
  dateFrom?: string;
  dateTo?: string;
};

type CommunicationRecordItem = {
  recordId: string;
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
  templateId: string;
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

const familyNameMap: Record<string, string> = {
  'family-001': '张家',
  'family-002': '林家',
  'family-003': '赵家',
  'family-004': '陈家',
};

const studentNameMap: Record<string, string> = {
  'student-001': '张小北',
  'student-002': '林一诺',
  'student-003': '赵安安',
  'student-004': '陈启元',
};

const channelLabelMap: Record<string, string> = {
  wechat: '微信',
  wecom: '企业微信',
  sms: '短信',
  phone: '电话',
  meeting: '面谈',
};

const directionLabelMap: Record<string, string> = {
  inbound: '呼入',
  outbound: '呼出',
  onsite: '到店',
};

const messageTypeMap: Record<string, string> = {
  'weekly-report': '成长周报',
  'invoice-reminder': '账单提醒',
  'homework-reminder': '家庭任务提醒',
};

const statusActionMap: Record<string, string> = {
  draft: '继续编辑 / 提交待发',
  pending: '立即发送 / 调整时间',
  sent: '查看回执 / 再次发送',
  failed: '重试失败 / 查看原因',
  read: '查看回执 / 关联沟通',
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

function toFamilyName(familyId?: string | null) {
  return familyId ? familyNameMap[familyId] ?? familyId : '--';
}

function toStudentName(studentId?: string | null) {
  return studentId ? studentNameMap[studentId] ?? studentId : '--';
}

function toChannelName(channel?: string | null) {
  return channel ? channelLabelMap[channel] ?? channel : '--';
}

function toDirectionName(direction?: string | null) {
  return direction ? directionLabelMap[direction] ?? direction : '--';
}

function toMessageType(code?: string | null, fallback?: string | null) {
  if (fallback) return fallback;
  return code ? messageTypeMap[code] ?? code : '--';
}

function toTemplateOwner(channel?: string | null) {
  if (channel === 'wechat' || channel === 'wecom') return '教务运营';
  if (channel === 'sms') return '成长顾问组';
  return '系统';
}

export const communicationService = {
  async queryRecords(params: CommunicationFilters = {}): Promise<PageResult<CommunicationRecordItem>> {
    const result = await apiRequest<PageResult<{
      id: string;
      familyId?: string | null;
      studentId?: string | null;
      channel: string;
      direction: string;
      topic: string;
      summary?: string | null;
      updatedAt: string;
    }>>(`/communication/records${buildQuery(params)}`);

    return {
      ...result,
      list: result.list.map((item) => ({
        recordId: item.id,
        occurredAt: formatAt(item.updatedAt),
        familyName: toFamilyName(item.familyId),
        studentName: toStudentName(item.studentId),
        channel: toChannelName(item.channel),
        direction: toDirectionName(item.direction),
        subject: item.topic,
        recorder: '沟通台账',
        actions: '查看详情 / 关联消息',
      })),
    };
  },

  async detailRecord(recordId: string) {
    const detail = await apiRequest<{
      id: string;
      familyId?: string | null;
      studentId?: string | null;
      channel: string;
      direction: string;
      topic: string;
      summary?: string | null;
      nextAction?: string | null;
      createdAt: string;
      updatedAt: string;
    }>(`/communication/records/${recordId}`);

    return {
      subject: detail.topic,
      timeline: [
        { title: '记录创建', detail: `${formatAt(detail.createdAt)} · ${toChannelName(detail.channel)} · ${toDirectionName(detail.direction)}` },
        { title: '沟通摘要', detail: detail.summary ?? '暂无摘要' },
        { title: '后续动作', detail: detail.nextAction ?? '后端尚未提供 meeting/homework 反查聚合，先显示记录内 nextAction。' },
      ],
      linkedActions: [
        { name: '关联家庭', detail: toFamilyName(detail.familyId) },
        { name: '关联学生', detail: toStudentName(detail.studentId) },
        { name: '联动消息中心', detail: 'message_tasks 真接口已接入，可继续扩成沟通 -> 消息草稿闭环。' },
      ],
    };
  },

  async queryMessages(params: CommunicationFilters = {}) {
    const [templates, drafts, queued, sent, failed] = await Promise.all([
      apiRequest<PageResult<{ id: string; code: string; name: string; channel: string; updatedAt: string }>>(`/communication/templates${buildQuery({ pageNo: 1, pageSize: 20, channel: params.channel })}`),
      apiRequest<PageResult<{ id: string; templateId?: string | null; familyId?: string | null; studentId?: string | null; channel: string; subject?: string | null; scheduledAt?: string | null; status: string }>>(`/communication/message-tasks${buildQuery({ ...params, status: 'draft' })}`),
      apiRequest<PageResult<{ id: string; templateId?: string | null; familyId?: string | null; studentId?: string | null; channel: string; subject?: string | null; scheduledAt?: string | null; status: string }>>(`/communication/message-tasks${buildQuery({ ...params, status: 'pending' })}`),
      apiRequest<PageResult<{ id: string; templateId?: string | null; familyId?: string | null; studentId?: string | null; channel: string; subject?: string | null; scheduledAt?: string | null; sentAt?: string | null; readAt?: string | null; status: string }>>(`/communication/message-tasks${buildQuery({ ...params, status: 'sent' })}`),
      apiRequest<PageResult<{ id: string; templateId?: string | null; familyId?: string | null; studentId?: string | null; channel: string; subject?: string | null; scheduledAt?: string | null; failureReason?: string | null; status: string }>>(`/communication/message-tasks${buildQuery({ ...params, status: 'failed' })}`),
    ]);

    const templateNameById = new Map(templates.list.map((item) => [item.id, item.name]));

    const mapTask = (item: { id: string; templateId?: string | null; familyId?: string | null; studentId?: string | null; channel: string; subject?: string | null; scheduledAt?: string | null; sentAt?: string | null; readAt?: string | null; status: string }) => ({
      messageId: item.id,
      messageType: toMessageType(item.templateId ? templateNameById.get(item.templateId) ?? item.templateId : undefined, item.subject),
      familyName: toFamilyName(item.familyId),
      studentName: toStudentName(item.studentId),
      channel: toChannelName(item.channel),
      scheduledAt: formatAt(item.readAt ?? item.sentAt ?? item.scheduledAt),
      status: item.status,
      actions: statusActionMap[item.status] ?? '查看详情',
    });

    const sentAndRead = await apiRequest<PageResult<{ id: string; templateId?: string | null; familyId?: string | null; studentId?: string | null; channel: string; subject?: string | null; scheduledAt?: string | null; sentAt?: string | null; readAt?: string | null; status: string }>>(`/communication/message-tasks${buildQuery({ ...params, status: 'read' })}`);

    return {
      filters: params,
      templates: {
        ...templates,
        list: templates.list.map((item) => ({
          templateId: item.id,
          templateName: item.name,
          messageType: toMessageType(item.code, item.name),
          channel: toChannelName(item.channel),
          lastUpdatedAt: formatAt(item.updatedAt),
          owner: toTemplateOwner(item.channel),
          actions: '编辑模板 / 复制模板',
        })),
      },
      drafts: { ...drafts, list: drafts.list.map(mapTask) },
      queued: { ...queued, list: queued.list.map(mapTask) },
      sent: { ...sent, list: [...sent.list, ...sentAndRead.list].map(mapTask) },
      failed: { ...failed, list: failed.list.map(mapTask) },
      statusPanels: [
        { name: '模板区', detail: 'communication/templates 真接口' },
        { name: '任务状态链路', detail: 'draft -> pending -> sent / failed，read 单独跟踪' },
        { name: '明确留坑', detail: '真渠道发送 adapter 仍未接，当前仅消费 message_tasks 持久化结果。' },
      ],
    };
  },

  actionMessage() {
    return {
      actions: ['创建消息', '立即发送', '重试失败', '查看回执'],
      note: '模板/消息任务已换真接口；真实渠道发送、回执回写 adapter 仍待后端补齐。',
    };
  },
};
