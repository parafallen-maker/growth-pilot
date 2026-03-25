import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { loadOptionalModule } from '../../../shared/runtime/load-optional-module';
import { ObjectStorageAdapter, PutObjectInput } from './object-storage.adapter';

type S3ClientCtor = new (config: Record<string, unknown>) => unknown;
type PutObjectCommandCtor = new (input: Record<string, unknown>) => unknown;
type GetObjectCommandCtor = new (input: Record<string, unknown>) => unknown;
type GetSignedUrl = (client: unknown, command: unknown, options: { expiresIn: number }) => Promise<string>;

@Injectable()
export class S3ObjectStorageAdapter implements ObjectStorageAdapter {
  private clientPromise?: Promise<unknown>;

  async putObject(input: PutObjectInput) {
    const { S3Client, PutObjectCommand } = await this.loadSdkOrThrow();
    const client = await this.getClient(S3Client);
    const command = new PutObjectCommand({
      Bucket: input.bucketName,
      Key: input.objectKey,
      Body: input.body ?? Buffer.alloc(0),
      ContentLength: input.body?.byteLength ?? 0,
      ContentType: input.mimeType,
      Metadata: {
        filename: input.fileName,
        checksum: input.checksum ?? '',
        ...(input.metadata ?? {}),
      },
    });

    const response = await (client as { send(command: unknown): Promise<{ ETag?: string }> }).send(command);
    return {
      bucketName: input.bucketName,
      objectKey: input.objectKey,
      provider: 'aws-s3-sdk',
      etag: response.ETag?.replace(/"/g, '') ?? createHash('sha1').update(input.objectKey).digest('hex'),
      url: await this.getObjectUrl(input.bucketName, input.objectKey),
    };
  }

  async getObjectUrl(bucketName: string, objectKey: string) {
    const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim();
    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/$/, '')}/${bucketName}/${objectKey}`;
    }

    const endpoint = process.env.S3_ENDPOINT?.trim();
    if (!endpoint) {
      return `s3://${bucketName}/${objectKey}`;
    }

    const runtime = await this.loadSdkOrThrow();
    const client = await this.getClient(runtime.S3Client);
    const command = new runtime.GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    return runtime.getSignedUrl(client, command, {
      expiresIn: Number(process.env.S3_SIGNED_URL_TTL_SECONDS ?? 900),
    });
  }

  private async getClient(S3Client: S3ClientCtor) {
    if (!this.clientPromise) {
      this.clientPromise = Promise.resolve(new S3Client({
        region: process.env.S3_REGION ?? 'us-east-1',
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') !== 'false',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY ?? '',
          secretAccessKey: process.env.S3_SECRET_KEY ?? '',
        },
      }));
    }

    return this.clientPromise;
  }

  private async loadSdkOrThrow() {
    const [clientModule, presignerModule] = await Promise.all([
      loadOptionalModule<{
        GetObjectCommand?: GetObjectCommandCtor;
        PutObjectCommand?: PutObjectCommandCtor;
        S3Client?: S3ClientCtor;
      }>('@aws-sdk/client-s3'),
      loadOptionalModule<{ getSignedUrl?: GetSignedUrl }>('@aws-sdk/s3-request-presigner'),
    ]);

    if (!clientModule?.S3Client || !clientModule.PutObjectCommand || !clientModule.GetObjectCommand || !presignerModule?.getSignedUrl) {
      throw new Error('S3 driver requested but @aws-sdk/client-s3 or @aws-sdk/s3-request-presigner is not available');
    }

    return {
      S3Client: clientModule.S3Client,
      PutObjectCommand: clientModule.PutObjectCommand,
      GetObjectCommand: clientModule.GetObjectCommand,
      getSignedUrl: presignerModule.getSignedUrl,
    };
  }
}
