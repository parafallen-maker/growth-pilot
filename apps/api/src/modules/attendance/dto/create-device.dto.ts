import { enumValue, optionalIdString, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateDeviceDto {
  static schema = strictObject({
    campusId: optionalIdString(),
    serialNo: trimmedString(1, 128),
    deviceType: enumValue(['beacon', 'tablet', 'gate', 'manual']).optional(),
    status: enumValue(['idle', 'bound', 'repair', 'retired']).optional(),
    note: optionalTrimmedString(255),
  });

  campusId?: string;
  serialNo!: string;
  deviceType?: 'beacon' | 'tablet' | 'gate' | 'manual';
  status?: 'idle' | 'bound' | 'repair' | 'retired';
  note?: string;
}
