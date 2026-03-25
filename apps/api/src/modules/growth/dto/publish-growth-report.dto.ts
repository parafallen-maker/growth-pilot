import { optionalIdString, optionalStringArray, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class PublishGrowthReportDto {
  static schema = strictObject({
    publisherUserId: optionalIdString(),
    publishNote: optionalTrimmedString(1000),
    channels: optionalStringArray(trimmedString(1, 32), 1, 8),
  });

  publisherUserId?: string;
  publishNote?: string;
  channels?: string[];
}
