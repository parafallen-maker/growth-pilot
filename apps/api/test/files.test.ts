import test from 'node:test';
import assert from 'node:assert/strict';
import { MockObjectStorageAdapter } from '../src/modules/files/adapter/mock-object-storage.adapter';
import { FileAssetRepository } from '../src/modules/files/repository/file-asset.repository';
import { FilesService } from '../src/modules/files/service/files.service';

function createFilesService() {
  return new FilesService(new FileAssetRepository(), new MockObjectStorageAdapter());
}

test('files service returns fileId for single and batch uploads', async () => {
  const service = createFilesService();

  const single = await service.uploadOne({
    fileName: 'homework-a.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 123456,
    purpose: 'homework',
    uploadedBy: 'teacher-001',
  });

  assert.match(single.fileId, /^file-/);
  assert.equal(single.storageProvider, 'mock-s3');
  assert.match(single.url, /^mock-s3:\/\//);

  const batch = await service.uploadMany([
    {
      fileName: 'homework-b.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 100,
      purpose: 'homework',
    },
    {
      fileName: 'homework-c.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 200,
      purpose: 'homework',
    },
  ]);

  assert.equal(batch.files.length, 2);
  assert.equal(batch.fileIds.length, 2);
  assert.deepEqual(batch.fileIds, batch.files.map((item) => item.fileId));
});
