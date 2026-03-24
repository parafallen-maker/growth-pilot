export class CreateAttendanceEventDto {
  studentId!: string;
  campusId!: string;
  deviceId?: string;
  eventType!: 'checkin' | 'checkout' | 'manual_checkin' | 'manual_checkout';
  eventTime!: string;
  operatorUserId?: string;
  remark?: string;
}
