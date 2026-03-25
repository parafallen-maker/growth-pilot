import { enumValue, optionalDateString, optionalIdString, optionalTrimmedString, strictObject, trimmedString, dateString } from '../../../common/validation';

export class CreateEnrollmentDto {
  static schema = strictObject({
    campusId: trimmedString(1, 64),
    termId: trimmedString(1, 64),
    primaryTeacherId: optionalIdString(),
    groupId: optionalIdString(),
    enrollDate: dateString(),
    leaveDate: optionalDateString(),
    leaveReason: optionalTrimmedString(255),
    status: enumValue(['active', 'paused', 'completed', 'withdrawn']).optional(),
  });

  campusId!: string;
  termId!: string;
  primaryTeacherId?: string;
  groupId?: string;
  enrollDate!: string;
  leaveDate?: string;
  leaveReason?: string;
  status?: string;
}
