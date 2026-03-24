export class CreateRefundDto {
  refundNo!: string;
  refundAmountCents!: number;
  refundTime!: string;
  reason?: string;
  status?: string;
}
