import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { GrowthController } from './controller/growth.controller';
import { ReportDraftJob } from './job/report-draft.job';
import { ReportMaterialAssembler } from './job/report-material-assembler';
import { GrowthRepository } from './repository/growth.repository';
import { GrowthService } from './service/growth.service';

@Module({
  imports: [JobsModule],
  controllers: [GrowthController],
  providers: [GrowthRepository, ReportMaterialAssembler, ReportDraftJob, GrowthService],
  exports: [GrowthService],
})
export class GrowthModule {}
