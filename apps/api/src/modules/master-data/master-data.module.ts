import { Module } from '@nestjs/common';
import { MasterDataStore } from './master-data.store';

@Module({
  providers: [MasterDataStore],
  exports: [MasterDataStore],
})
export class MasterDataModule {}
