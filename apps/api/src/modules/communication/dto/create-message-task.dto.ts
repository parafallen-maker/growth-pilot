import type { MessageTaskStatus } from '@growthpilot/schema/index';
import { dateTimeString, enumValue, optionalDateTimeString, optionalIdString, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateMessageTaskDto {
  static schema = strictObject({
    templateId: optionalIdString(),
    familyId: trimmedString(1, 64),
    studentId: optionalIdString(),
    channel: trimmedString(1, 32),
    subject: optionalTrimmedString(128),
    body: trimmedString(1, 4000),
    scheduledAt: optionalDateTimeString(),
    status: enumValue(['draft', 'pending', 'sent', 'failed', 'read']).optional(),
    failureReason: optionalTrimmedString(255),
  });

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
