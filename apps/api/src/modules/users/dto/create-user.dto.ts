import {
  enumValue,
  optionalEmailString,
  optionalMobileString,
  optionalStringArray,
  strictObject,
  trimmedString,
} from '../../../common/validation';

export class CreateUserDto {
  static schema = strictObject({
    username: trimmedString(3, 64),
    password: trimmedString(8, 128),
    displayName: trimmedString(1, 64),
    mobile: optionalMobileString(),
    email: optionalEmailString(),
    roleIds: optionalStringArray(trimmedString(1, 64)),
    campusIds: optionalStringArray(trimmedString(1, 64)),
    status: enumValue(['active', 'inactive']).optional(),
  });

  username!: string;
  password!: string;
  displayName!: string;
  mobile?: string;
  email?: string;
  roleIds?: string[];
  campusIds?: string[];
  status?: string;
}
