import { dateString, enumValue, optionalDateString, optionalEmailString, optionalMobileString, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateTeacherDto {
  static schema = strictObject({
    campusId: trimmedString(1, 64),
    employeeNo: trimmedString(1, 64),
    name: trimmedString(1, 64),
    mobile: optionalMobileString(),
    email: optionalEmailString(),
    hireDate: optionalDateString(),
    leadSubject: optionalTrimmedString(64),
    status: enumValue(['active', 'inactive']).optional(),
  });

  campusId!: string;
  employeeNo!: string;
  name!: string;
  mobile?: string;
  email?: string;
  hireDate?: string;
  leadSubject?: string;
  status?: string;
}
