export class CreatePaymentDto {
  paymentNo!: string;
  paidAmountCents!: number;
  paymentTime!: string;
  channel!: string;
  transactionNo?: string;
  remark?: string;
  status?: string;
}
