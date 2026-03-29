import { optionalDateTimeString, optionalIdString, optionalTrimmedString, strictObject, trimmedString, optionalEnumValue } from '../../../common/validation';

export class CreateAlertDto {
  static schema = strictObject({
    alertType: trimmedString(1, 64),
    alertLevel: optionalEnumValue(['low', 'medium', 'high']),
    title: trimmedString(1, 120),
    content: trimmedString(1, 2000),
    sourceType: optionalTrimmedString(64),
    sourceId: optionalIdString(),
    studentId: optionalIdString(),
    familyId: optionalIdString(),
    invoiceId: optionalIdString(),
    resolverUserId: optionalIdString(),
    resolvedAt: optionalDateTimeString(),
    status: optionalEnumValue(['open', 'acknowledged', 'resolved']),
  }).strict();

  alertType!: string;
  alertLevel?: string;
  title!: string;
  content!: string;
  sourceType?: string;
  sourceId?: string;
  studentId?: string;
  familyId?: string;
  invoiceId?: string;
  resolverUserId?: string;
  resolvedAt?: string;
  status?: string;
}
