import { Injectable } from '@nestjs/common';
import { HomeworkRepository } from '../repository/homework.repository';

export interface HomeworkDomainEvent {
  eventName: 'HomeworkSubmitted' | 'HomeworkReviewed';
  bizId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

@Injectable()
export class HomeworkEventPublisher {
  constructor(private readonly homeworkRepository: HomeworkRepository) {}

  publish(eventName: HomeworkDomainEvent['eventName'], bizId: string, payload: Record<string, unknown>) {
    return this.homeworkRepository.enqueueOutboxEvent(eventName, bizId, payload);
  }

  list() {
    return this.homeworkRepository.listOutboxEvents();
  }
}
