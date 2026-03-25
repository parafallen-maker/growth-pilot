import { enumValue, optionalStringArray, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateMessageTemplateDto {
  static schema = strictObject({
    code: trimmedString(1, 64),
    name: trimmedString(1, 128),
    channel: trimmedString(1, 32),
    subject: optionalTrimmedString(128),
    bodyTemplate: trimmedString(1, 4000),
    variables: optionalStringArray(trimmedString(1, 64), 1, 64),
    status: enumValue(['active', 'inactive']).optional(),
  });

  code!: string;
  name!: string;
  channel!: string;
  subject?: string;
  bodyTemplate!: string;
  variables?: string[];
  status?: string;
}
