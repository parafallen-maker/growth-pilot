import { Injectable } from '@nestjs/common';

export interface HomeworkDomainEvent {
  eventName: 'HomeworkSubmitted' | 'HomeworkReviewed';
  bizId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

@Injectable()
export class HomeworkEventPublisher {
  private readonly events: HomeworkDomainEvent[] = [];

  publish(eventName: HomeworkDomainEvent['eventName'], bizId: string, payload: Record<string, unknown>) {
    const event: HomeworkDomainEvent = {
      eventName,
      bizId,
      payload,
      createdAt: new Date().toISOString(),
    };
    this.events.unshift(event);
    return event;
  }

  list() {
    return [...this.events];
  }
}
