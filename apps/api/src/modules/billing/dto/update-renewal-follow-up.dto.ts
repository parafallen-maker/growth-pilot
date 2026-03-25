import { dateTimeString, optionalTrimmedString, strictObject, zod } from '../../../common/validation';

export class UpdateRenewalFollowUpDto {
  static schema = strictObject({
    nextFollowUpAt: zod.union([dateTimeString(), zod.null()]),
    note: optionalTrimmedString(1000),
  });

  nextFollowUpAt!: string | null;
  note?: string;
}
