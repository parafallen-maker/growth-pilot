import { Module } from '@nestjs/common';
import { MockObjectStorageAdapter } from './adapter/mock-object-storage.adapter';
import { OBJECT_STORAGE_ADAPTER } from './adapter/object-storage.adapter';
import { FilesController } from './controller/files.controller';
import { FileAssetRepository } from './repository/file-asset.repository';
import { FilesService } from './service/files.service';

@Module({
  controllers: [FilesController],
  providers: [
    FileAssetRepository,
    FilesService,
    MockObjectStorageAdapter,
    {
      provide: OBJECT_STORAGE_ADAPTER,
      useExisting: MockObjectStorageAdapter,
    },
  ],
  exports: [FilesService, FileAssetRepository, OBJECT_STORAGE_ADAPTER],
})
export class FilesModule {}
