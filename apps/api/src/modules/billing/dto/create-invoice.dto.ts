import { dateString, enumValue, integerNumber, optionalDateString, optionalIdString, optionalIntegerNumber, optionalTrimmedString, strictObject, trimmedString, zod } from '../../../common/validation';

class CreateInvoiceItemDto {
  static schema = strictObject({
    itemName: trimmedString(1, 128),
    productId: optionalIdString(),
    quantity: optionalIntegerNumber(1),
    unitPriceCents: optionalIntegerNumber(0),
    amountCents: integerNumber(0),
    remark: optionalTrimmedString(255),
  });

  itemName!: string;
  productId?: string;
  quantity?: number;
  unitPriceCents?: number;
  amountCents!: number;
  remark?: string;
}

export class CreateInvoiceDto {
  static schema = strictObject({
    invoiceNo: trimmedString(1, 64),
    contractId: optionalIdString(),
    familyId: trimmedString(1, 64),
    studentId: trimmedString(1, 64),
    billingPeriod: optionalTrimmedString(32),
    issueDate: dateString(),
    dueDate: optionalDateString(),
    amountCents: integerNumber(0),
    note: optionalTrimmedString(1000),
    status: enumValue(['draft', 'issued', 'paid', 'overdue', 'cancelled']).optional(),
    items: zod.array(CreateInvoiceItemDto.schema).max(50).optional(),
  });

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
  items?: Array<CreateInvoiceItemDto>;
}
