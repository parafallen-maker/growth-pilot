import type { MessageTaskStatus } from '@growthpilot/schema/index';

export class CreateMessageTaskDto {
  templateId?: string;
  familyId!: string;
  studentId?: string;
  channel!: string;
  subject?: string;
  body!: string;
  scheduledAt?: string;
  status?: MessageTaskStatus;
  failureReason?: string;
}
