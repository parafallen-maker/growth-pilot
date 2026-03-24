export class UploadFileDto {
  fileName!: string;
  mimeType!: string;
  sizeBytes!: number;
  checksum?: string;
  bucketName?: string;
  uploadedBy?: string;
  purpose?: string;
  sourceType?: string;
  metadata?: Record<string, string>;
}
