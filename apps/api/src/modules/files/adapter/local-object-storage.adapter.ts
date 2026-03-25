import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ObjectStorageAdapter, PutObjectInput } from './object-storage.adapter';

@Injectable()
export class LocalObjectStorageAdapter implements ObjectStorageAdapter {
  async putObject(input: PutObjectInput) {
    const filePath = resolve(process.cwd(), '.data/object-storage', input.bucketName, input.objectKey);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, input.body ?? Buffer.alloc(0));
    return {
      bucketName: input.bucketName,
      objectKey: input.objectKey,
      provider: 'local-s3-compatible',
      etag: createHash('sha1').update(input.body ?? input.objectKey).digest('hex'),
      url: await this.getObjectUrl(input.bucketName, input.objectKey),
    };
  }

  async getObjectUrl(bucketName: string, objectKey: string) {
    return `local-s3://${bucketName}/${objectKey}`;
  }
}
