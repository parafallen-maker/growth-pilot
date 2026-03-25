import { dateTimeString, enumValue, optionalDateTimeString, optionalIdString, strictObject, trimmedString } from '../../../common/validation';

export class CreateDeviceBindingDto {
  static schema = strictObject({
    studentId: trimmedString(1, 64),
    deviceId: trimmedString(1, 64),
    status: enumValue(['active', 'inactive']).optional(),
    boundAt: optionalDateTimeString(),
    createdBy: optionalIdString(),
  });

  studentId!: string;
  deviceId!: string;
  status?: 'active' | 'inactive';
  boundAt?: string;
  createdBy?: string;
}
