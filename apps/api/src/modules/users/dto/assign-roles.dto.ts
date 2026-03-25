import { optionalIdString, strictObject, stringArray, trimmedString } from '../../../common/validation';

export class AssignRolesDto {
  static schema = strictObject({
    roleIds: stringArray(trimmedString(1, 64), 0),
    campusId: optionalIdString(),
  });

  roleIds!: string[];
  campusId?: string;
}
