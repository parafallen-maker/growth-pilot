import type { MessageTaskStatus } from '@growthpilot/schema/index';
import { dateTimeString, enumValue, optionalDateTimeString, optionalTrimmedString, strictObject } from '../../../common/validation';

export class UpdateMessageTaskStatusDto {
  static schema = strictObject({
    status: enumValue(['draft', 'pending', 'sent', 'failed', 'read']),
    sentAt: optionalDateTimeString(),
    failureReason: optionalTrimmedString(255),
  });

  status!: MessageTaskStatus;
  sentAt?: string;
  failureReason?: string;
}
