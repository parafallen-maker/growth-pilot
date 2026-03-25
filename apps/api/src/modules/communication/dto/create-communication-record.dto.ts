import { optionalIdString, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateCommunicationRecordDto {
  static schema = strictObject({
    familyId: trimmedString(1, 64),
    studentId: optionalIdString(),
    channel: trimmedString(1, 32),
    direction: trimmedString(1, 32),
    topic: optionalTrimmedString(128),
    summary: trimmedString(1, 2000),
    nextAction: optionalTrimmedString(1000),
  });

  familyId!: string;
  studentId?: string;
  channel!: string;
  direction!: string;
  topic?: string;
  summary!: string;
  nextAction?: string;
}
