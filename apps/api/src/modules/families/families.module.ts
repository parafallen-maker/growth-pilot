import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { FamiliesController } from './families.controller';
import { FamiliesRepository } from './repository/families.repository';
import { FamiliesService } from './families.service';

@Module({
  imports: [AuthModule, MasterDataModule],
  controllers: [FamiliesController],
  providers: [ApiAuthGuard, PermissionGuard, FamiliesRepository, FamiliesService],
  exports: [FamiliesRepository, FamiliesService],
})
export class FamiliesModule {}
