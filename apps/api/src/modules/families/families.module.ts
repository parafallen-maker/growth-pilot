import { Module } from '@nestjs/common';
import { MasterDataModule } from '../master-data/master-data.module';
import { FamiliesController } from './families.controller';
import { FamiliesRepository } from './repository/families.repository';
import { FamiliesService } from './families.service';

@Module({
  imports: [MasterDataModule],
  controllers: [FamiliesController],
  providers: [FamiliesRepository, FamiliesService],
  exports: [FamiliesRepository, FamiliesService],
})
export class FamiliesModule {}
