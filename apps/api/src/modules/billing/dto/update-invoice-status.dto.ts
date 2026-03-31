import { optionalTrimmedString, strictObject } from '../../../common/validation';

export class UpdateInvoiceStatusDto {
  static schema = strictObject({
    status: optionalTrimmedString(32),
  });

  status?: string;
}
