export class CreateStudentImportDto {
  importType?: string;
  fileId?: string;
  format?: 'csv' | 'json';
  fileName?: string;
  content?: string;
  records?: Array<Record<string, unknown>>;
  delimiter?: string;
  dryRun?: boolean;
}
