import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { FileAsset } from '@growthpilot/schema/index';
import { FileAssetRepository } from '../repository/file-asset.repository';
import { OBJECT_STORAGE_ADAPTER, ObjectStorageAdapter } from '../adapter/object-storage.adapter';
import { UploadFileDto } from '../dto/upload-file.dto';

@Injectable()
export class FilesService {
  constructor(
    private readonly fileAssetRepository: FileAssetRepository,
    @Inject(OBJECT_STORAGE_ADAPTER)
    private readonly objectStorageAdapter: ObjectStorageAdapter,
  ) {}

  async uploadOne(payload: UploadFileDto) {
    this.validatePayload(payload);
    const objectKey = this.buildObjectKey(payload);
    const putResult = await this.objectStorageAdapter.putObject({
      bucketName: payload.bucketName ?? process.env.S3_BUCKET ?? 'growthpilot-dev',
      objectKey,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      checksum: payload.checksum,
      body: payload.contentBase64 ? Buffer.from(payload.contentBase64, 'base64') : undefined,
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
    bucketName?: string;
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
      bucketName: input.bucketName,
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
}
