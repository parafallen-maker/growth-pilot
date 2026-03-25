import { dateTimeString, enumValue, optionalDateString, optionalDateTimeString, optionalIdString, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateRenewalDto {
  static schema = strictObject({
    familyId: trimmedString(1, 64),
    studentId: trimmedString(1, 64),
    campusId: optionalIdString(),
    termId: optionalIdString(),
    contractId: optionalIdString(),
    ownerUserId: optionalIdString(),
    expectedEndDate: optionalDateString(),
    status: enumValue(['todo', 'contacting', 'won', 'lost', 'closed']).optional(),
    lastContactAt: optionalDateTimeString(),
    nextFollowUpAt: optionalDateTimeString(),
    note: optionalTrimmedString(1000),
  });

  familyId!: string;
  studentId!: string;
  campusId?: string;
  termId?: string;
  contractId?: string;
  ownerUserId?: string;
  expectedEndDate?: string;
  status?: 'todo' | 'contacting' | 'won' | 'lost' | 'closed';
  lastContactAt?: string;
  nextFollowUpAt?: string;
  note?: string;
}
