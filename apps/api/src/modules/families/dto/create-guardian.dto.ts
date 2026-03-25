import { optionalBooleanValue, optionalEmailString, optionalMobileString, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateGuardianDto {
  static schema = strictObject({
    name: trimmedString(1, 64),
    relation: trimmedString(1, 32),
    mobile: optionalMobileString(),
    wechatId: optionalTrimmedString(64),
    email: optionalEmailString(),
    occupation: optionalTrimmedString(64),
    isPrimary: optionalBooleanValue(),
    isEmergency: optionalBooleanValue(),
    notes: optionalTrimmedString(1000),
  });

  name!: string;
  relation!: string;
  mobile?: string;
  wechatId?: string;
  email?: string;
  occupation?: string;
  isPrimary?: boolean;
  isEmergency?: boolean;
  notes?: string;
}
