import { optionalDateTimeString, optionalIdString, optionalTrimmedString, strictObject, optionalEnumValue } from '../../../common/validation';

export class UpdateAlertDto {
  static schema = strictObject({
    status: optionalEnumValue(['open', 'acknowledged', 'resolved']),
    resolverUserId: optionalIdString(),
    resolvedAt: optionalDateTimeString(),
    content: optionalTrimmedString(2000),
  }).strict();

  status?: 'open' | 'acknowledged' | 'resolved';
  resolverUserId?: string;
  resolvedAt?: string;
  content?: string;
}
