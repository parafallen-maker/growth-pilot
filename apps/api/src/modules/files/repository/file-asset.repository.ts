import { Injectable, NotFoundException } from '@nestjs/common';
import type { FileAsset } from '@growthpilot/schema/index';
import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { createDb, dbSchema } from '../../../db';
import { FileJsonStore } from '../../../shared/persistence/file-json-store';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';

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

interface FileAssetStoreShape {
  fileAssets: FileAsset[];
}

interface FileAssetRepositoryPort {
  list(): Promise<FileAsset[]>;
  create(input: CreateFileAssetRecord): Promise<FileAsset>;
  createMany(inputs: CreateFileAssetRecord[]): Promise<FileAsset[]>;
  getById(fileId: string): Promise<FileAsset | undefined>;
  getManyByIds(fileIds: string[]): Promise<FileAsset[]>;
}

const createInitialState = (): FileAssetStoreShape => ({
  fileAssets: [
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
  ],
});

class FileFileAssetRepository implements FileAssetRepositoryPort {
  private readonly store: FileJsonStore<FileAssetStoreShape>;

  constructor(filePath = '.data/file-assets.json') {
    this.store = new FileJsonStore<FileAssetStoreShape>(filePath, createInitialState);
  }

  async list() {
    return [...this.store.read().fileAssets];
  }

  async create(input: CreateFileAssetRecord) {
    const fileAsset: FileAsset = {
      id: randomUUID(),
      ...input,
      checksum: input.checksum ?? null,
      uploadedBy: input.uploadedBy ?? null,
      createdAt: new Date().toISOString(),
    };
    this.store.update((state) => {
      state.fileAssets.unshift(fileAsset);
    });
    return fileAsset;
  }

  async createMany(inputs: CreateFileAssetRecord[]) {
    return Promise.all(inputs.map((input) => this.create(input)));
  }

  async getById(fileId: string) {
    return this.store.read().fileAssets.find((item) => item.id === fileId);
  }

  async getManyByIds(fileIds: string[]) {
    const assets = await Promise.all(fileIds.map((fileId) => this.getById(fileId)));
    return assets.filter((asset): asset is FileAsset => Boolean(asset));
  }
}

class DbFileAssetRepository implements FileAssetRepositoryPort {
  private readonly db = createDb();

  async list() {
    const rows = await this.db.select().from(dbSchema.fileAssets).orderBy(asc(dbSchema.fileAssets.createdAt));
    return rows.map((row) => this.map(row));
  }

  async create(input: CreateFileAssetRecord) {
    const [created] = await this.db.insert(dbSchema.fileAssets).values({
      storageProvider: input.storageProvider,
      bucketName: input.bucketName,
      objectKey: input.objectKey,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksum: input.checksum ?? null,
      uploadedBy: input.uploadedBy ?? null,
      createdAt: new Date(),
    }).returning();
    return this.map(created);
  }

  async createMany(inputs: CreateFileAssetRecord[]) {
    if (!inputs.length) return [];
    const rows = await this.db.insert(dbSchema.fileAssets).values(
      inputs.map((input) => ({
        storageProvider: input.storageProvider,
        bucketName: input.bucketName,
        objectKey: input.objectKey,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        checksum: input.checksum ?? null,
        uploadedBy: input.uploadedBy ?? null,
        createdAt: new Date(),
      })),
    ).returning();
    return rows.map((row) => this.map(row));
  }

  async getById(fileId: string) {
    const rows = await this.db.select().from(dbSchema.fileAssets).where(eq(dbSchema.fileAssets.id, fileId)).limit(1);
    return rows[0] ? this.map(rows[0]) : undefined;
  }

  async getManyByIds(fileIds: string[]) {
    const assets = await Promise.all(fileIds.map((fileId) => this.getById(fileId)));
    return assets.filter((asset): asset is FileAsset => Boolean(asset));
  }

  private map(row: typeof dbSchema.fileAssets.$inferSelect): FileAsset {
    return {
      id: row.id,
      storageProvider: row.storageProvider,
      bucketName: row.bucketName,
      objectKey: row.objectKey,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      checksum: row.checksum ?? null,
      uploadedBy: row.uploadedBy ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

@Injectable()
export class FileAssetRepository {
  private readonly adapter: FileAssetRepositoryPort;

  constructor() {
    this.adapter = isDbPersistenceEnabled() ? new DbFileAssetRepository() : new FileFileAssetRepository();
  }

  list() {
    return this.adapter.list();
  }

  create(input: CreateFileAssetRecord) {
    return this.adapter.create(input);
  }

  createMany(inputs: CreateFileAssetRecord[]) {
    return this.adapter.createMany(inputs);
  }

  getById(fileId: string) {
    return this.adapter.getById(fileId);
  }

  async getByIdOrThrow(fileId: string) {
    const asset = await this.getById(fileId);
    if (!asset) {
      throw new NotFoundException(`File asset ${fileId} not found`);
    }
    return asset;
  }

  async getManyByIds(fileIds: string[]) {
    const assets = await this.adapter.getManyByIds(fileIds);
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    return fileIds.map((fileId) => {
      const asset = assetById.get(fileId);
      if (!asset) {
        throw new NotFoundException(`File asset ${fileId} not found`);
      }
      return asset;
    });
  }
}
