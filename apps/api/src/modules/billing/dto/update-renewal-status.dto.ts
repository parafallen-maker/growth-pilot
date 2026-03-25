import { enumValue, optionalDateTimeString, optionalTrimmedString, strictObject } from '../../../common/validation';

export class UpdateRenewalStatusDto {
  static schema = strictObject({
    status: enumValue(['todo', 'contacting', 'won', 'lost', 'closed']),
    lastContactAt: optionalDateTimeString(),
    note: optionalTrimmedString(1000),
  });

  status!: 'todo' | 'contacting' | 'won' | 'lost' | 'closed';
  lastContactAt?: string;
  note?: string;
}
