import { base64String, integerNumber, optionalIdString, optionalRecordOfStrings, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class UploadFileDto {
  static schema = strictObject({
    fileName: trimmedString(1, 255),
    mimeType: trimmedString(1, 128),
    sizeBytes: integerNumber(0),
    checksum: optionalTrimmedString(255),
    uploadedBy: optionalIdString(),
    purpose: optionalTrimmedString(64),
    sourceType: optionalTrimmedString(32),
    metadata: optionalRecordOfStrings(),
    contentBase64: base64String().optional(),
  });

  fileName!: string;
  mimeType!: string;
  sizeBytes!: number;
  checksum?: string;
  uploadedBy?: string;
  purpose?: string;
  sourceType?: string;
  metadata?: Record<string, string>;
  contentBase64?: string;
}
