import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { FileAsset } from '@growthpilot/schema/index';
import { FileAssetRepository } from '../repository/file-asset.repository';
import { OBJECT_STORAGE_ADAPTER, ObjectStorageAdapter } from '../adapter/object-storage.adapter';
import { UploadFileDto } from '../dto/upload-file.dto';

export const MAX_FILE_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_REQUEST_BYTES = 50 * 1024 * 1024;

const ALLOWED_FILE_MIME_TYPES = new Set([
  'application/msword',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

@Injectable()
export class FilesService {
  constructor(
    private readonly fileAssetRepository: FileAssetRepository,
    @Inject(OBJECT_STORAGE_ADAPTER)
    private readonly objectStorageAdapter: ObjectStorageAdapter,
  ) {}

  async uploadOne(payload: UploadFileDto) {
    const body = this.validatePayload(payload);
    const objectKey = this.buildObjectKey(payload);
    const putResult = await this.objectStorageAdapter.putObject({
      bucketName: process.env.S3_BUCKET ?? 'growthpilot-dev',
      objectKey,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      checksum: payload.checksum,
      body,
      metadata: {
        purpose: payload.purpose ?? 'general',
        sourceType: payload.sourceType ?? 'api_metadata_upload',
        ...(payload.metadata ?? {}),
      },
    });

    const fileAsset = await this.fileAssetRepository.create({
      storageProvider: putResult.provider,
      bucketName: putResult.bucketName,
      objectKey: putResult.objectKey,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      checksum: payload.checksum ?? null,
      uploadedBy: payload.uploadedBy ?? null,
    });

    return this.toUploadResult(fileAsset);
  }

  async uploadMultipartFile(input: {
    fileName: string;
    mimeType: string;
    content: Buffer;
    uploadedBy?: string;
    purpose?: string;
    sourceType?: string;
    metadata?: Record<string, string>;
  }) {
    return this.uploadOne({
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.content.byteLength,
      checksum: `sha256:${createHash('sha256').update(input.content).digest('hex')}`,
      uploadedBy: input.uploadedBy,
      purpose: input.purpose,
      sourceType: input.sourceType ?? 'api_multipart_upload',
      metadata: input.metadata,
      contentBase64: input.content.toString('base64'),
    });
  }

  async uploadMany(files: UploadFileDto[]) {
    if (!files.length) {
      throw new BadRequestException('files is required');
    }

    const totalBytes = files.reduce((sum, file) => sum + (Number(file.sizeBytes) || 0), 0);
    if (totalBytes > MAX_UPLOAD_REQUEST_BYTES) {
      throw new BadRequestException(`batch upload size exceeds ${MAX_UPLOAD_REQUEST_BYTES} bytes`);
    }

    const uploaded = await Promise.all(files.map((file) => this.uploadOne(file)));
    return {
      files: uploaded,
      fileIds: uploaded.map((item) => item.fileId),
    };
  }

  async getFileAsset(fileId: string) {
    return this.toAssetDetail(await this.fileAssetRepository.getByIdOrThrow(fileId));
  }

  async resolveFileUrls(fileIds: string[]) {
    return Promise.all(
      (await this.fileAssetRepository.getManyByIds(fileIds))
        .map((asset) => this.objectStorageAdapter.getObjectUrl(asset.bucketName, asset.objectKey)),
    );
  }

  async assertFileAssetsExist(fileIds: string[]) {
    await this.fileAssetRepository.getManyByIds(fileIds);
  }

  private validatePayload(payload: UploadFileDto) {
    if (!payload.fileName?.trim()) throw new BadRequestException('fileName is required');
    if (!payload.mimeType?.trim()) throw new BadRequestException('mimeType is required');
    if (!Number.isFinite(payload.sizeBytes) || payload.sizeBytes < 0) throw new BadRequestException('sizeBytes must be a non-negative number');
    if (payload.sizeBytes > MAX_FILE_UPLOAD_BYTES) {
      throw new BadRequestException(`single file size exceeds ${MAX_FILE_UPLOAD_BYTES} bytes`);
    }
    if (!this.isAllowedMimeType(payload.mimeType)) {
      throw new BadRequestException(`mimeType ${payload.mimeType} is not allowed`);
    }

    if (!payload.contentBase64) {
      return undefined;
    }

    const body = Buffer.from(payload.contentBase64, 'base64');
    if (body.byteLength > MAX_FILE_UPLOAD_BYTES) {
      throw new BadRequestException(`single file size exceeds ${MAX_FILE_UPLOAD_BYTES} bytes`);
    }

    return body;
  }

  private buildObjectKey(payload: UploadFileDto) {
    const safeFileName = payload.fileName.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const purpose = payload.purpose ?? 'general';
    return `${purpose}/${year}/${month}/${randomUUID()}-${safeFileName}`;
  }

  private async toUploadResult(fileAsset: FileAsset) {
    return {
      fileId: fileAsset.id,
      fileName: fileAsset.fileName,
      mimeType: fileAsset.mimeType,
      sizeBytes: fileAsset.sizeBytes,
      bucketName: fileAsset.bucketName,
      objectKey: fileAsset.objectKey,
      storageProvider: fileAsset.storageProvider,
      url: await this.objectStorageAdapter.getObjectUrl(fileAsset.bucketName, fileAsset.objectKey),
      createdAt: fileAsset.createdAt,
    };
  }

  private async toAssetDetail(fileAsset: FileAsset) {
    return {
      ...(await this.toUploadResult(fileAsset)),
      checksum: fileAsset.checksum ?? null,
      uploadedBy: fileAsset.uploadedBy ?? null,
    };
  }

  private isAllowedMimeType(mimeType: string) {
    return mimeType.startsWith('image/') || ALLOWED_FILE_MIME_TYPES.has(mimeType);
  }
}
