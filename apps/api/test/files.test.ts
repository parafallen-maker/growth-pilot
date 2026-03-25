import test from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { LocalObjectStorageAdapter } from '../src/modules/files/adapter/local-object-storage.adapter';
import { MockObjectStorageAdapter } from '../src/modules/files/adapter/mock-object-storage.adapter';
import { S3ObjectStorageAdapter } from '../src/modules/files/adapter/s3-object-storage.adapter';
import { FileAssetRepository } from '../src/modules/files/repository/file-asset.repository';
import { FilesService } from '../src/modules/files/service/files.service';

function createFilesService(useMock = false) {
  rmSync('.data/file-assets.json', { force: true });
  rmSync('.data/object-storage', { force: true, recursive: true });
  return new FilesService(new FileAssetRepository(), useMock ? new MockObjectStorageAdapter() : new LocalObjectStorageAdapter());
}

test('files service returns fileId for single and batch uploads', async () => {
  const service = createFilesService();

  const single = await service.uploadOne({
    fileName: 'homework-a.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 123456,
    purpose: 'homework',
    uploadedBy: 'teacher-001',
    contentBase64: Buffer.from('demo-a').toString('base64'),
  });

  assert.match(single.fileId, /-/);
  assert.equal(single.storageProvider, 'local-s3-compatible');
  assert.match(single.url, /^local-s3:\/\//);

  const batch = await service.uploadMany([
    {
      fileName: 'homework-b.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 100,
      purpose: 'homework',
      contentBase64: Buffer.from('b').toString('base64'),
    },
    {
      fileName: 'homework-c.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 200,
      purpose: 'homework',
      contentBase64: Buffer.from('c').toString('base64'),
    },
  ]);

  assert.equal(batch.files.length, 2);
  assert.equal(batch.fileIds.length, 2);
  assert.deepEqual(batch.fileIds, batch.files.map((item) => item.fileId));
});

test('files service keeps mock provider replaceable', async () => {
  const service = createFilesService(true);
  const uploaded = await service.uploadMultipartFile({
    fileName: 'demo.txt',
    mimeType: 'text/plain',
    content: Buffer.from('hello'),
  });

  assert.equal(uploaded.storageProvider, 'mock-s3');
  assert.match(uploaded.url, /^mock-s3:\/\//);
});

test('s3 adapter can resolve MinIO-compatible public URLs without loading the SDK', async () => {
  const originalBaseUrl = process.env.S3_PUBLIC_BASE_URL;
  process.env.S3_PUBLIC_BASE_URL = 'http://localhost:9000';

  try {
    const adapter = new S3ObjectStorageAdapter();
    assert.equal(
      await adapter.getObjectUrl('growthpilot-dev', 'homework/2026/03/demo.txt'),
      'http://localhost:9000/growthpilot-dev/homework/2026/03/demo.txt',
    );
  } finally {
    if (originalBaseUrl === undefined) {
      delete process.env.S3_PUBLIC_BASE_URL;
    } else {
      process.env.S3_PUBLIC_BASE_URL = originalBaseUrl;
    }
  }
});
