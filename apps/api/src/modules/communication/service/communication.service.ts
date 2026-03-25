import { Injectable, NotFoundException } from '@nestjs/common';
import type { CommunicationRecord, MessageTask, MessageTaskStatus, MessageTemplate } from '@growthpilot/schema/index';
import { normalizePage } from '../../../common/base-list-query.dto';
import type { PageResult } from '../../../common/api-response';
import { CommunicationQueryDto } from '../dto/communication-query.dto';
import { CreateCommunicationRecordDto } from '../dto/create-communication-record.dto';
import { CreateMessageTaskDto } from '../dto/create-message-task.dto';
import { CreateMessageTemplateDto } from '../dto/create-message-template.dto';
import { MessageTaskQueryDto } from '../dto/message-task-query.dto';
import { MessageTemplateQueryDto } from '../dto/message-template-query.dto';
import { UpdateMessageTaskStatusDto } from '../dto/update-message-task-status.dto';
import { UpdateMessageTemplateDto } from '../dto/update-message-template.dto';
import { CommunicationRepository } from '../repository/communication.repository';

@Injectable()
export class CommunicationService {
  constructor(private readonly communicationRepository: CommunicationRepository) {}

  async listRecords(query: CommunicationQueryDto): Promise<PageResult<CommunicationRecord>> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = (await this.communicationRepository.listRecords()).filter((item) => {
      if (query.familyId && item.familyId !== query.familyId) return false;
      if (query.studentId && item.studentId !== query.studentId) return false;
      if (query.channel && item.channel !== query.channel) return false;
      if (query.keyword) {
        const haystack = [item.topic, item.summary, item.nextAction].filter(Boolean).join(' ');
        if (!haystack.includes(query.keyword)) return false;
      }
      return true;
    });

    return this.paginate(filtered, pageNo, pageSize);
  }

  async getRecord(recordId: string) {
    const record = await this.communicationRepository.findRecordById(recordId);
    if (!record) throw new NotFoundException(`communication record ${recordId} not found`);
    return record;
  }

  async createRecord(payload: CreateCommunicationRecordDto) {
    return await this.communicationRepository.createRecord({
      familyId: payload.familyId,
      studentId: payload.studentId,
      channel: payload.channel,
      direction: payload.direction,
      topic: payload.topic,
      summary: payload.summary,
      nextAction: payload.nextAction,
    });
  }

  async listTemplates(query: MessageTemplateQueryDto): Promise<PageResult<MessageTemplate>> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = (await this.communicationRepository.listTemplates()).filter((item) => {
      if (query.status && item.status !== query.status) return false;
      if (query.channel && item.channel !== query.channel) return false;
      if (query.keyword) {
        const haystack = [item.name, item.code, item.subject, item.bodyTemplate].filter(Boolean).join(' ');
        if (!haystack.includes(query.keyword)) return false;
      }
      return true;
    });

    return this.paginate(filtered, pageNo, pageSize);
  }

  async createTemplate(payload: CreateMessageTemplateDto) {
    return await this.communicationRepository.createTemplate({
      code: payload.code,
      name: payload.name,
      channel: payload.channel,
      subject: payload.subject,
      bodyTemplate: payload.bodyTemplate,
      variables: payload.variables ?? [],
      status: payload.status ?? 'active',
    });
  }

  async updateTemplate(templateId: string, payload: UpdateMessageTemplateDto) {
    return await this.communicationRepository.updateTemplate(templateId, payload);
  }

  async listMessageTasks(query: MessageTaskQueryDto): Promise<PageResult<MessageTask>> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = (await this.communicationRepository.listMessageTasks()).filter((item) => {
      if (query.familyId && item.familyId !== query.familyId) return false;
      if (query.studentId && item.studentId !== query.studentId) return false;
      if (query.status && item.status !== query.status) return false;
      if (query.channel && item.channel !== query.channel) return false;
      if (query.keyword) {
        const haystack = [item.subject, item.body, item.failureReason].filter(Boolean).join(' ');
        if (!haystack.includes(query.keyword)) return false;
      }
      return true;
    });

    return this.paginate(filtered, pageNo, pageSize);
  }

  async createMessageTask(payload: CreateMessageTaskDto) {
    const status = this.resolveInitialStatus(payload.status, payload.scheduledAt);
    return await this.communicationRepository.createMessageTask({
      templateId: payload.templateId,
      familyId: payload.familyId,
      studentId: payload.studentId,
      channel: payload.channel,
      subject: payload.subject,
      body: payload.body,
      scheduledAt: payload.scheduledAt,
      status,
      sentAt: status === 'sent' ? new Date().toISOString() : undefined,
      failureReason: status === 'failed' ? payload.failureReason ?? 'manual mark failed' : undefined,
      readAt: undefined,
    });
  }

  async updateMessageTaskStatus(taskId: string, payload: UpdateMessageTaskStatusDto) {
    const patch: Partial<MessageTask> = {
      status: payload.status,
      failureReason: payload.failureReason,
    };

    if (payload.status === 'sent') {
      patch.sentAt = payload.sentAt ?? new Date().toISOString();
      patch.failureReason = undefined;
    }

    if (payload.status === 'failed') {
      patch.sentAt = undefined;
      patch.failureReason = payload.failureReason ?? 'send failed';
    }

    if (payload.status === 'draft' || payload.status === 'pending') {
      patch.sentAt = undefined;
      patch.failureReason = undefined;
    }

    return await this.communicationRepository.updateMessageTask(taskId, patch);
  }

  private resolveInitialStatus(status: MessageTaskStatus | undefined, scheduledAt?: string): MessageTaskStatus {
    if (status) return status;
    return scheduledAt ? 'pending' : 'draft';
  }

  private paginate<T>(items: T[], pageNo: number, pageSize: number): PageResult<T> {
    const start = (pageNo - 1) * pageSize;
    return {
      list: items.slice(start, start + pageSize),
      page: {
        pageNo,
        pageSize,
        total: items.length,
      },
    };
  }
}
