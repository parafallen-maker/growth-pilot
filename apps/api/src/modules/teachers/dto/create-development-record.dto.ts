import { enumValue, optionalDateString, optionalIdString, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateDevelopmentRecordDto {
  static schema = strictObject({
    recordType: trimmedString(1, 64),
    title: trimmedString(1, 128),
    occurredAt: optionalDateString(),
    observerTeacherId: optionalIdString(),
    strengths: optionalTrimmedString(1000),
    improvements: optionalTrimmedString(1000),
    actionItems: optionalTrimmedString(1000),
    dueDate: optionalDateString(),
    status: enumValue(['draft', 'open', 'done']).optional(),
    attachmentFileId: optionalIdString(),
  });

  recordType!: string;
  title!: string;
  occurredAt?: string;
  observerTeacherId?: string;
  strengths?: string;
  improvements?: string;
  actionItems?: string;
  dueDate?: string;
  status?: string;
  attachmentFileId?: string;
}
