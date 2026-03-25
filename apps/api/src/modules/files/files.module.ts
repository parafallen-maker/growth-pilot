import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { LocalObjectStorageAdapter } from './adapter/local-object-storage.adapter';
import { MockObjectStorageAdapter } from './adapter/mock-object-storage.adapter';
import { OBJECT_STORAGE_ADAPTER } from './adapter/object-storage.adapter';
import { FilesController } from './controller/files.controller';
import { FileAssetRepository } from './repository/file-asset.repository';
import { FilesService } from './service/files.service';

@Module({
  imports: [AuthModule],
  controllers: [FilesController],
  providers: [ApiAuthGuard, PermissionGuard, 
    FileAssetRepository,
    FilesService,
    MockObjectStorageAdapter,
    LocalObjectStorageAdapter,
    {
      provide: OBJECT_STORAGE_ADAPTER,
      useFactory: (localAdapter: LocalObjectStorageAdapter, mockAdapter: MockObjectStorageAdapter) =>
        process.env.OBJECT_STORAGE_DRIVER === 'mock' ? mockAdapter : localAdapter,
      inject: [LocalObjectStorageAdapter, MockObjectStorageAdapter],
    },
  ],
  exports: [FilesService, FileAssetRepository, OBJECT_STORAGE_ADAPTER],
})
export class FilesModule {}
