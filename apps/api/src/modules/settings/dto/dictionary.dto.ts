import { strictObject, trimmedString, optionalTrimmedString } from '../../../common/validation';

export class CreateDictionaryDto {
  static schema = strictObject({
    dictType: trimmedString(1, 64),
    code: trimmedString(1, 64),
    label: trimmedString(1, 128),
    value: trimmedString(1, 128),
  });

  dictType!: string;
  code!: string;
  label!: string;
  value!: string;
}

export class UpdateDictionaryDto {
  static schema = strictObject({
    dictType: trimmedString(1, 64),
    code: trimmedString(1, 64),
    label: optionalTrimmedString(128),
    value: optionalTrimmedString(128),
  });

  dictType!: string;
  code!: string;
  label?: string;
  value?: string;
}
