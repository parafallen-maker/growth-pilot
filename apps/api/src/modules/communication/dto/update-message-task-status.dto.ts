import type { MessageTaskStatus } from '@growthpilot/schema/index';

export class UpdateMessageTaskStatusDto {
  status!: MessageTaskStatus;
  sentAt?: string;
  failureReason?: string;
}
