import { optionalIdString, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class UpdateStudentDto {
  static schema = strictObject({
    name: optionalTrimmedString(64),
    gradeLabel: optionalTrimmedString(32),
    gender: optionalTrimmedString(16),
    status: optionalTrimmedString(32),
    familyId: optionalIdString(),
  });

  name?: string;
  gradeLabel?: string;
  gender?: string;
  status?: string;
  familyId?: string;
}
