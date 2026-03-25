import { Injectable } from '@nestjs/common';
import { ObjectStorageAdapter, PutObjectInput } from './object-storage.adapter';

@Injectable()
export class MockObjectStorageAdapter implements ObjectStorageAdapter {
  async putObject(input: PutObjectInput) {
    return {
      bucketName: input.bucketName,
      objectKey: input.objectKey,
      provider: 'mock-s3',
      etag: `etag-${Buffer.from(input.objectKey).toString('base64url').slice(0, 12)}`,
      url: await this.getObjectUrl(input.bucketName, input.objectKey),
    };
  }

  async getObjectUrl(bucketName: string, objectKey: string) {
    return `mock-s3://${bucketName}/${objectKey}`;
  }
}
