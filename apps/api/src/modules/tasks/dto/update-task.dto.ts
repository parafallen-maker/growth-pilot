import { optionalTrimmedString, strictObject, optionalEnumValue } from '../../../common/validation';

export class UpdateTaskDto {
  static schema = strictObject({
    status: optionalEnumValue(['open', 'in_progress', 'done']),
    resultNote: optionalTrimmedString(1000),
  }).strict();

  status?: 'open' | 'in_progress' | 'done';
  resultNote?: string;
}
