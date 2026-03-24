export class CreateBillingProductDto {
  code!: string;
  name!: string;
  category!: string;
  billingMode!: string;
  priceCents!: number;
  unit?: string;
  description?: string;
  status?: string;
}
