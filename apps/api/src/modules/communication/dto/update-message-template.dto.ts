import { enumValue, optionalStringArray, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class UpdateMessageTemplateDto {
  static schema = strictObject({
    code: optionalTrimmedString(64),
    name: optionalTrimmedString(128),
    channel: optionalTrimmedString(32),
    subject: optionalTrimmedString(128),
    bodyTemplate: optionalTrimmedString(4000),
    variables: optionalStringArray(trimmedString(1, 64), 1, 64),
    status: enumValue(['active', 'inactive']).optional(),
  });

  code?: string;
  name?: string;
  channel?: string;
  subject?: string;
  bodyTemplate?: string;
  variables?: string[];
  status?: string;
}
