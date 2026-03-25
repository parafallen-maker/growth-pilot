import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { JobsModule } from '../jobs/jobs.module';
import { GrowthController } from './controller/growth.controller';
import { ReportDraftJob } from './job/report-draft.job';
import { ReportMaterialAssembler } from './job/report-material-assembler';
import { GrowthRepository } from './repository/growth.repository';
import { GrowthService } from './service/growth.service';

@Module({
  imports: [AuthModule, JobsModule],
  controllers: [GrowthController],
  providers: [ApiAuthGuard, PermissionGuard, GrowthRepository, ReportMaterialAssembler, ReportDraftJob, GrowthService],
  exports: [GrowthService],
})
export class GrowthModule {}
