export class CreateContractDto {
  contractNo!: string;
  campusId?: string;
  termId?: string;
  familyId!: string;
  studentId!: string;
  signDate!: string;
  startDate!: string;
  endDate!: string;
  discountAmountCents?: number;
  remark?: string;
  status?: string;
  items!: Array<{
    productId?: string;
    itemName: string;
    unitPriceCents: number;
    quantity: number;
  }>;
}
