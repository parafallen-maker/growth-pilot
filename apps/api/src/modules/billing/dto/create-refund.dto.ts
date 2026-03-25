import { dateTimeString, enumValue, integerNumber, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateRefundDto {
  static schema = strictObject({
    refundNo: trimmedString(1, 64),
    refundAmountCents: integerNumber(0),
    refundTime: dateTimeString(),
    reason: optionalTrimmedString(255),
    status: enumValue(['pending', 'completed', 'rejected']).optional(),
  });

  refundNo!: string;
  refundAmountCents!: number;
  refundTime!: string;
  reason?: string;
  status?: string;
}
