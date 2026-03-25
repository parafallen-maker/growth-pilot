import { enumValue, integerNumber, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateBillingProductDto {
  static schema = strictObject({
    code: trimmedString(1, 64),
    name: trimmedString(1, 128),
    category: trimmedString(1, 64),
    billingMode: trimmedString(1, 64),
    priceCents: integerNumber(0),
    unit: optionalTrimmedString(32),
    description: optionalTrimmedString(1000),
    status: enumValue(['active', 'inactive']).optional(),
  });

  code!: string;
  name!: string;
  category!: string;
  billingMode!: string;
  priceCents!: number;
  unit?: string;
  description?: string;
  status?: string;
}
