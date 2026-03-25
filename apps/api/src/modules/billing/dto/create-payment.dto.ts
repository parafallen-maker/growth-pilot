import { dateTimeString, enumValue, integerNumber, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreatePaymentDto {
  static schema = strictObject({
    paymentNo: trimmedString(1, 64),
    paidAmountCents: integerNumber(0),
    paymentTime: dateTimeString(),
    channel: trimmedString(1, 32),
    transactionNo: optionalTrimmedString(128),
    remark: optionalTrimmedString(255),
    status: enumValue(['success', 'failed', 'canceled']).optional(),
  });

  paymentNo!: string;
  paidAmountCents!: number;
  paymentTime!: string;
  channel!: string;
  transactionNo?: string;
  remark?: string;
  status?: string;
}
