import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CommunicationRecord, MessageTask, MessageTemplate } from '@growthpilot/schema/index';
import { PersistentJsonStore } from '../../../common/persistent-json.store';

interface CommunicationState {
  records: CommunicationRecord[];
  templates: MessageTemplate[];
  messageTasks: MessageTask[];
}

@Injectable()
export class CommunicationRepository {
  private readonly store: PersistentJsonStore<CommunicationState>;

  constructor() {
    this.store = new PersistentJsonStore('.data/communication.json', () => ({
      records: [
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
      ],
      templates: [
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
      ],
      messageTasks: [
        {
          id: 'msg-task-001',
          templateId: 'msg-template-001',
          familyId: 'family-001',
          studentId: 'student-001',
          channel: 'wechat',
          subject: '本周成长简报',
          body: '您好，小明本周表现稳定，专注度明显提升。',
          status: 'draft',
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
          failureReason: 'wechat api timeout',
          createdAt: '2026-03-24T19:20:00+08:00',
          updatedAt: '2026-03-24T20:01:00+08:00',
        },
      ],
    }));
  }

  private get state() { return this.store.get(); }

  listRecords() { return [...this.state.records]; }
  findRecordById(recordId: string) { return this.state.records.find((item) => item.id === recordId); }

  createRecord(input: Omit<CommunicationRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    let created!: CommunicationRecord;
    this.store.update((state) => {
      const now = new Date().toISOString();
      created = { ...input, id: `comm-record-${String(state.records.length + 1).padStart(3, '0')}`, createdAt: now, updatedAt: now };
      state.records.unshift(created);
    });
    return created;
  }

  listTemplates() { return [...this.state.templates]; }
  findTemplateByCode(code: string) { return this.state.templates.find((item) => item.code === code); }

  createTemplate(input: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>) {
    let created!: MessageTemplate;
    this.store.update((state) => {
      if (state.templates.some((item) => item.code === input.code)) throw new ConflictException({ code: 'DATA_409', message: 'template code already exists' });
      const now = new Date().toISOString();
      created = { ...input, id: `msg-template-${String(state.templates.length + 1).padStart(3, '0')}`, createdAt: now, updatedAt: now };
      state.templates.unshift(created);
    });
    return created;
  }

  updateTemplate(templateId: string, patch: Partial<MessageTemplate>) {
    let updated!: MessageTemplate;
    this.store.update((state) => {
      const template = state.templates.find((item) => item.id === templateId);
      if (!template) throw new NotFoundException(`message template ${templateId} not found`);
      if (patch.code && patch.code !== template.code && state.templates.some((item) => item.code === patch.code)) {
        throw new ConflictException({ code: 'DATA_409', message: 'template code already exists' });
      }
      Object.assign(template, patch, { updatedAt: new Date().toISOString() });
      updated = template;
    });
    return updated;
  }

  listMessageTasks() { return [...this.state.messageTasks]; }

  createMessageTask(input: Omit<MessageTask, 'id' | 'createdAt' | 'updatedAt'>) {
    let created!: MessageTask;
    this.store.update((state) => {
      const now = new Date().toISOString();
      created = { ...input, id: `msg-task-${String(state.messageTasks.length + 1).padStart(3, '0')}`, createdAt: now, updatedAt: now };
      state.messageTasks.unshift(created);
    });
    return created;
  }

  updateMessageTask(taskId: string, patch: Partial<MessageTask>) {
    let updated!: MessageTask;
    this.store.update((state) => {
      const task = state.messageTasks.find((item) => item.id === taskId);
      if (!task) throw new NotFoundException(`message task ${taskId} not found`);
      Object.assign(task, patch, { updatedAt: new Date().toISOString() });
      updated = task;
    });
    return updated;
  }
}
