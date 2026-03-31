import type { PageResult } from '@/lib/api-client';
import type { QueryBase } from '@/features/shared/types';
import { serverApiRequest } from '@/lib/server-api';

export type CommunicationFilters = QueryBase & {
  familyId?: string;
  studentId?: string;
  channel?: string;
  direction?: string;
  messageStatus?: 'draft' | 'pending' | 'sent' | 'failed' | 'read';
  dateFrom?: string;
  dateTo?: string;
};

export type CreateCommunicationRecordPayload = {
  familyId?: string;
  studentId?: string;
  channel: string;
  direction: string;
  topic: string;
  summary?: string;
  nextAction?: string;
};

export type CreateMessageTemplatePayload = {
  code: string;
  name: string;
  channel: string;
  subject?: string;
  bodyTemplate: string;
  variables?: string[];
  status?: string;
};

export type CreateMessageTaskPayload = {
  templateId?: string;
  familyId?: string;
  studentId?: string;
  channel: string;
  subject?: string;
  body?: string;
  scheduledAt?: string;
  status?: 'draft' | 'pending' | 'sent' | 'failed' | 'read';
  failureReason?: string;
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

function toFamilyName(familyId: string | null | undefined, familyNameById: Map<string, string>) {
  return familyId ? familyNameById.get(familyId) ?? familyId : '--';
}

function toStudentName(studentId: string | null | undefined, studentNameById: Map<string, string>) {
  return studentId ? studentNameById.get(studentId) ?? studentId : '--';
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

async function fetchFamilyNameById() {
  const result = await serverApiRequest<PageResult<{ id: string; familyName?: string | null; primaryContactName?: string | null; familyCode: string }>>('/families?pageNo=1&pageSize=200');
  return new Map(result.list.map((item) => [item.id, item.familyName ?? item.primaryContactName ?? item.familyCode]));
}

async function fetchStudentNameById() {
  const result = await serverApiRequest<PageResult<{ id: string; name: string }>>('/students?pageNo=1&pageSize=200');
  return new Map(result.list.map((item) => [item.id, item.name]));
}

export const communicationService = {
  async queryRecords(params: CommunicationFilters = {}): Promise<PageResult<CommunicationRecordItem>> {
    const [result, familyNameById, studentNameById] = await Promise.all([
      serverApiRequest<PageResult<{
        id: string;
        familyId?: string | null;
        studentId?: string | null;
        channel: string;
        direction: string;
        topic: string;
        summary?: string | null;
        updatedAt: string;
      }>>(`/communication/records${buildQuery(params)}`),
      fetchFamilyNameById(),
      fetchStudentNameById(),
    ]);

    return {
      ...result,
      list: result.list.map((item) => ({
        recordId: item.id,
        occurredAt: formatAt(item.updatedAt),
        familyName: toFamilyName(item.familyId, familyNameById),
        studentName: toStudentName(item.studentId, studentNameById),
        channel: toChannelName(item.channel),
        direction: toDirectionName(item.direction),
        subject: item.topic,
        recorder: '沟通台账',
        actions: '查看详情 / 关联消息',
      })),
    };
  },

  async detailRecord(recordId: string) {
    const [detail, familyNameById, studentNameById] = await Promise.all([
      serverApiRequest<{
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
      }>(`/communication/records/${recordId}`),
      fetchFamilyNameById(),
      fetchStudentNameById(),
    ]);

    return {
      subject: detail.topic,
      timeline: [
        { title: '记录创建', detail: `${formatAt(detail.createdAt)} · ${toChannelName(detail.channel)} · ${toDirectionName(detail.direction)}` },
        { title: '沟通摘要', detail: detail.summary ?? '暂无摘要' },
        { title: '后续动作', detail: detail.nextAction ?? '暂无后续动作' },
      ],
      linkedActions: [
        { name: '关联家庭', detail: toFamilyName(detail.familyId, familyNameById) },
        { name: '关联学生', detail: toStudentName(detail.studentId, studentNameById) },
        { name: '联动消息中心', detail: '' },
      ],
    };
  },

  async createRecord(payload: CreateCommunicationRecordPayload) {
    return serverApiRequest<{ id: string; topic: string }>(`/communication/records`, {
      method: 'POST',
      body: payload,
    });
  },

  async queryMessages(params: CommunicationFilters = {}) {
    const [templates, drafts, queued, sent, failed, sentAndRead, familyNameById, studentNameById] = await Promise.all([
      serverApiRequest<PageResult<{ id: string; code: string; name: string; channel: string; updatedAt: string }>>(`/communication/templates${buildQuery({ pageNo: 1, pageSize: 20, channel: params.channel })}`),
      serverApiRequest<PageResult<{ id: string; templateId?: string | null; familyId?: string | null; studentId?: string | null; channel: string; subject?: string | null; scheduledAt?: string | null; status: string }>>(`/communication/message-tasks${buildQuery({ ...params, status: 'draft' })}`),
      serverApiRequest<PageResult<{ id: string; templateId?: string | null; familyId?: string | null; studentId?: string | null; channel: string; subject?: string | null; scheduledAt?: string | null; status: string }>>(`/communication/message-tasks${buildQuery({ ...params, status: 'pending' })}`),
      serverApiRequest<PageResult<{ id: string; templateId?: string | null; familyId?: string | null; studentId?: string | null; channel: string; subject?: string | null; scheduledAt?: string | null; sentAt?: string | null; readAt?: string | null; status: string }>>(`/communication/message-tasks${buildQuery({ ...params, status: 'sent' })}`),
      serverApiRequest<PageResult<{ id: string; templateId?: string | null; familyId?: string | null; studentId?: string | null; channel: string; subject?: string | null; scheduledAt?: string | null; failureReason?: string | null; status: string }>>(`/communication/message-tasks${buildQuery({ ...params, status: 'failed' })}`),
      serverApiRequest<PageResult<{ id: string; templateId?: string | null; familyId?: string | null; studentId?: string | null; channel: string; subject?: string | null; scheduledAt?: string | null; sentAt?: string | null; readAt?: string | null; status: string }>>(`/communication/message-tasks${buildQuery({ ...params, status: 'read' })}`),
      fetchFamilyNameById(),
      fetchStudentNameById(),
    ]);

    const templateNameById = new Map(templates.list.map((item) => [item.id, item.name]));

    const mapTask = (item: { id: string; templateId?: string | null; familyId?: string | null; studentId?: string | null; channel: string; subject?: string | null; scheduledAt?: string | null; sentAt?: string | null; readAt?: string | null; status: string }) => ({
      messageId: item.id,
      messageType: toMessageType(item.templateId ? templateNameById.get(item.templateId) ?? item.templateId : undefined, item.subject),
      familyName: toFamilyName(item.familyId, familyNameById),
      studentName: toStudentName(item.studentId, studentNameById),
      channel: toChannelName(item.channel),
      scheduledAt: formatAt(item.readAt ?? item.sentAt ?? item.scheduledAt),
      status: item.status,
      actions: statusActionMap[item.status] ?? '查看详情',
    });

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
      statusPanels: [],
    };
  },

  async createTemplate(payload: CreateMessageTemplatePayload) {
    return serverApiRequest<{ id: string; code: string; name: string }>(`/communication/templates`, {
      method: 'POST',
      body: payload,
    });
  },

  async createMessageTask(payload: CreateMessageTaskPayload) {
    return serverApiRequest<{ id: string; status: string }>(`/communication/message-tasks`, {
      method: 'POST',
      body: payload,
    });
  },

  async updateMessageTaskStatus(taskId: string, payload: { status: string; failureReason?: string; sentAt?: string }) {
    return serverApiRequest<{ id: string; status: string }>(`/communication/message-tasks/${taskId}/status`, {
      method: 'PATCH',
      body: payload,
    });
  },

  actionMessage() {
    return {
      actions: ['创建消息', '立即发送', '重试失败', '查看回执'],
      note: '',
    };
  },
};
