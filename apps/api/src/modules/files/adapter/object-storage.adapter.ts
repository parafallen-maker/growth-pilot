export const OBJECT_STORAGE_ADAPTER = Symbol('OBJECT_STORAGE_ADAPTER');

export interface PutObjectInput {
  bucketName: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string;
  metadata?: Record<string, string>;
  body?: Buffer;
}

export interface PutObjectResult {
  bucketName: string;
  objectKey: string;
  provider: string;
  etag?: string;
  url: string;
}

export interface ObjectStorageAdapter {
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  getObjectUrl(bucketName: string, objectKey: string): string;
}
