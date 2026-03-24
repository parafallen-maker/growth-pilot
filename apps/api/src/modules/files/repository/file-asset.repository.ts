import { Injectable, NotFoundException } from '@nestjs/common';
import type { FileAsset } from '@growthpilot/schema/index';

export interface CreateFileAssetRecord {
  storageProvider: string;
  bucketName: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string | null;
  uploadedBy?: string | null;
}

@Injectable()
export class FileAssetRepository {
  private readonly fileAssets: FileAsset[] = [
    {
      id: 'file-001',
      storageProvider: 'mock-s3',
      bucketName: 'growthpilot-dev',
      objectKey: 'homework/2026/03/file-001-math-01.jpg',
      fileName: 'math-01.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 204800,
      checksum: 'sha256:demo-001',
      uploadedBy: 'user-teacher-001',
      createdAt: '2026-03-23T18:00:00+08:00',
    },
    {
      id: 'file-002',
      storageProvider: 'mock-s3',
      bucketName: 'growthpilot-dev',
      objectKey: 'homework/2026/03/file-002-math-02.jpg',
      fileName: 'math-02.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 198100,
      checksum: 'sha256:demo-002',
      uploadedBy: 'user-teacher-001',
      createdAt: '2026-03-23T18:01:00+08:00',
    },
  ];

  list() {
    return [...this.fileAssets];
  }

  create(input: CreateFileAssetRecord) {
    const fileAsset: FileAsset = {
      id: `file-${String(this.fileAssets.length + 1).padStart(3, '0')}`,
      ...input,
      checksum: input.checksum ?? null,
      uploadedBy: input.uploadedBy ?? null,
      createdAt: new Date().toISOString(),
    };
    this.fileAssets.unshift(fileAsset);
    return fileAsset;
  }

  createMany(inputs: CreateFileAssetRecord[]) {
    return inputs.map((input) => this.create(input));
  }

  getById(fileId: string) {
    return this.fileAssets.find((item) => item.id === fileId);
  }

  getByIdOrThrow(fileId: string) {
    const asset = this.getById(fileId);
    if (!asset) {
      throw new NotFoundException(`File asset ${fileId} not found`);
    }
    return asset;
  }

  getManyByIds(fileIds: string[]) {
    return fileIds.map((fileId) => this.getByIdOrThrow(fileId));
  }
}
