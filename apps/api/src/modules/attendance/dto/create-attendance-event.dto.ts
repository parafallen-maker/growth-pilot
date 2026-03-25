import { dateTimeString, enumValue, optionalIdString, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateAttendanceEventDto {
  static schema = strictObject({
    studentId: trimmedString(1, 64),
    campusId: trimmedString(1, 64),
    deviceId: optionalIdString(),
    eventType: enumValue(['checkin', 'checkout', 'manual_checkin', 'manual_checkout']),
    eventTime: dateTimeString(),
    operatorUserId: optionalIdString(),
    remark: optionalTrimmedString(255),
  });

  studentId!: string;
  campusId!: string;
  deviceId?: string;
  eventType!: 'checkin' | 'checkout' | 'manual_checkin' | 'manual_checkout';
  eventTime!: string;
  operatorUserId?: string;
  remark?: string;
}
