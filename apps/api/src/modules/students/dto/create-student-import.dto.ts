import { enumValue, optionalBooleanValue, optionalTrimmedString, strictObject, trimmedString, zod } from '../../../common/validation';

export class CreateStudentImportDto {
  static schema = strictObject({
    importType: optionalTrimmedString(32),
    fileId: optionalTrimmedString(64),
    format: enumValue(['csv', 'json']).optional(),
    fileName: optionalTrimmedString(255),
    content: optionalTrimmedString(1_000_000),
    records: zod.array(zod.record(zod.string(), zod.unknown())).max(5000).optional(),
    delimiter: optionalTrimmedString(4),
    dryRun: optionalBooleanValue(),
  });

  importType?: string;
  fileId?: string;
  format?: 'csv' | 'json';
  fileName?: string;
  content?: string;
  records?: Array<Record<string, unknown>>;
  delimiter?: string;
  dryRun?: boolean;
}
