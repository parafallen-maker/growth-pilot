import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CommunicationRecord, MessageTask, MessageTemplate } from '@growthpilot/schema/index';

@Injectable()
export class CommunicationRepository {
  private readonly records: CommunicationRecord[] = [
    {
      id: 'comm-record-001',
      familyId: 'family-001',
      studentId: 'student-001',
      channel: 'wechat',
      direction: 'outbound',
      topic: '周报沟通',
      summary: '已与家长同步本周专注度提升情况。',
      nextAction: '周五继续跟进家庭任务反馈。',
      createdAt: '2026-03-24T19:30:00+08:00',
      updatedAt: '2026-03-24T19:30:00+08:00',
    },
  ];

  private readonly templates: MessageTemplate[] = [
    {
      id: 'msg-template-001',
      code: 'weekly-report',
      name: '周报发送模板',
      channel: 'wechat',
      subject: '本周成长简报',
      bodyTemplate: '您好，{{studentName}} 本周表现：{{summary}}',
      variables: ['studentName', 'summary'],
      status: 'active',
      createdAt: '2026-03-24T19:00:00+08:00',
      updatedAt: '2026-03-24T19:00:00+08:00',
    },
  ];

  private readonly messageTasks: MessageTask[] = [
    {
      id: 'msg-task-001',
      templateId: 'msg-template-001',
      familyId: 'family-001',
      studentId: 'student-001',
      channel: 'wechat',
      subject: '本周成长简报',
      body: '您好，小明本周表现稳定，专注度明显提升。',
      status: 'draft',
      scheduledAt: undefined,
      sentAt: undefined,
      failureReason: undefined,
      readAt: undefined,
      createdAt: '2026-03-24T19:10:00+08:00',
      updatedAt: '2026-03-24T19:10:00+08:00',
    },
    {
      id: 'msg-task-002',
      templateId: 'msg-template-001',
      familyId: 'family-002',
      studentId: 'student-002',
      channel: 'wechat',
      subject: '账单提醒',
      body: '请查收本期账单。',
      status: 'failed',
      scheduledAt: '2026-03-24T20:00:00+08:00',
      sentAt: undefined,
      failureReason: 'wechat api timeout',
      readAt: undefined,
      createdAt: '2026-03-24T19:20:00+08:00',
      updatedAt: '2026-03-24T20:01:00+08:00',
    },
  ];

  listRecords() { return [...this.records]; }
  findRecordById(recordId: string) { return this.records.find((item) => item.id === recordId); }

  createRecord(input: Omit<CommunicationRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const record: CommunicationRecord = {
      ...input,
      id: `comm-record-${String(this.records.length + 1).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
    };
    this.records.unshift(record);
    return record;
  }

  listTemplates() { return [...this.templates]; }
  findTemplateByCode(code: string) { return this.templates.find((item) => item.code === code); }

  createTemplate(input: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>) {
    if (this.findTemplateByCode(input.code)) {
      throw new ConflictException({ code: 'DATA_409', message: 'template code already exists' });
    }
    const now = new Date().toISOString();
    const template: MessageTemplate = {
      ...input,
      id: `msg-template-${String(this.templates.length + 1).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
    };
    this.templates.unshift(template);
    return template;
  }

  updateTemplate(templateId: string, patch: Partial<MessageTemplate>) {
    const template = this.templates.find((item) => item.id === templateId);
    if (!template) throw new NotFoundException(`message template ${templateId} not found`);
    if (patch.code && patch.code !== template.code && this.findTemplateByCode(patch.code)) {
      throw new ConflictException({ code: 'DATA_409', message: 'template code already exists' });
    }
    Object.assign(template, patch, { updatedAt: new Date().toISOString() });
    return template;
  }

  listMessageTasks() { return [...this.messageTasks]; }

  createMessageTask(input: Omit<MessageTask, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const task: MessageTask = {
      ...input,
      id: `msg-task-${String(this.messageTasks.length + 1).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
    };
    this.messageTasks.unshift(task);
    return task;
  }

  updateMessageTask(taskId: string, patch: Partial<MessageTask>) {
    const task = this.messageTasks.find((item) => item.id === taskId);
    if (!task) throw new NotFoundException(`message task ${taskId} not found`);
    Object.assign(task, patch, { updatedAt: new Date().toISOString() });
    return task;
  }
}
