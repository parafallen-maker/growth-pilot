export class CreateInvoiceDto {
  invoiceNo!: string;
  contractId?: string;
  familyId!: string;
  studentId!: string;
  billingPeriod?: string;
  issueDate!: string;
  dueDate?: string;
  amountCents!: number;
  note?: string;
  status?: string;
  items?: Array<{
    itemName: string;
    productId?: string;
    quantity?: number;
    unitPriceCents?: number;
    amountCents: number;
    remark?: string;
  }>;
}
