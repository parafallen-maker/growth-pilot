import { dateTimeString, enumValue, optionalTrimmedString, strictObject, zod } from '../../../common/validation';

export class UpdateDeviceBindingDto {
  static schema = strictObject({
    status: enumValue(['active', 'inactive']).optional(),
    unboundAt: zod.union([dateTimeString(), zod.null()]).optional(),
    note: optionalTrimmedString(255),
  });

  status?: 'active' | 'inactive';
  unboundAt?: string | null;
  note?: string;
}
