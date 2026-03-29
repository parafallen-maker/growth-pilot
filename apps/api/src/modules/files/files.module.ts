import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { LocalObjectStorageAdapter } from './adapter/local-object-storage.adapter';
import { MockObjectStorageAdapter } from './adapter/mock-object-storage.adapter';
import { OBJECT_STORAGE_ADAPTER, ObjectStorageAdapter } from './adapter/object-storage.adapter';
import { S3ObjectStorageAdapter } from './adapter/s3-object-storage.adapter';
import { FilesController } from './controller/files.controller';
import { FileAssetRepository } from './repository/file-asset.repository';
import { FilesService } from './service/files.service';

@Module({
  imports: [AuthModule],
  controllers: [FilesController],
  providers: [ApiAuthGuard, PermissionGuard,
    FileAssetRepository,
    MockObjectStorageAdapter,
    LocalObjectStorageAdapter,
    S3ObjectStorageAdapter,
    {
      provide: OBJECT_STORAGE_ADAPTER,
      useFactory: (
        localAdapter: LocalObjectStorageAdapter,
        mockAdapter: MockObjectStorageAdapter,
        s3Adapter: S3ObjectStorageAdapter,
      ) => {
        if (process.env.OBJECT_STORAGE_DRIVER === 'mock') {
          return mockAdapter;
        }
        if (process.env.OBJECT_STORAGE_DRIVER === 's3') {
          return s3Adapter;
        }
        return localAdapter;
      },
      inject: [LocalObjectStorageAdapter, MockObjectStorageAdapter, S3ObjectStorageAdapter],
    },
    {
      provide: FilesService,
      useFactory: (fileAssetRepository: FileAssetRepository, objectStorageAdapter: ObjectStorageAdapter) => (
        new FilesService(fileAssetRepository, objectStorageAdapter)
      ),
      inject: [FileAssetRepository, OBJECT_STORAGE_ADAPTER],
    },
  ],
  exports: [FilesService, FileAssetRepository, OBJECT_STORAGE_ADAPTER],
})
export class FilesModule {}
