import { dateString, enumValue, integerNumber, optionalIdString, optionalIntegerNumber, optionalTrimmedString, strictObject, trimmedString, zod } from '../../../common/validation';

class CreateContractItemDto {
  static schema = strictObject({
    productId: optionalIdString(),
    itemName: trimmedString(1, 128),
    unitPriceCents: integerNumber(0),
    quantity: integerNumber(1),
  });

  productId?: string;
  itemName!: string;
  unitPriceCents!: number;
  quantity!: number;
}

export class CreateContractDto {
  static schema = strictObject({
    contractNo: trimmedString(1, 64),
    campusId: optionalIdString(),
    termId: optionalIdString(),
    familyId: trimmedString(1, 64),
    studentId: trimmedString(1, 64),
    signDate: dateString(),
    startDate: dateString(),
    endDate: dateString(),
    discountAmountCents: optionalIntegerNumber(0),
    remark: optionalTrimmedString(1000),
    status: enumValue(['draft', 'active', 'expired', 'cancelled']).optional(),
    items: zod.array(CreateContractItemDto.schema).min(1).max(20),
  });

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
  items!: Array<CreateContractItemDto>;
}
