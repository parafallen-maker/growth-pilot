import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { BullmqJobBroker } from './queue/bullmq-job-broker';
import { JobsController } from './controller/jobs.controller';
import { JobsRepository } from './repository/jobs.repository';
import { JobsService } from './service/jobs.service';

@Module({
  imports: [AuthModule],
  controllers: [JobsController],
  providers: [ApiAuthGuard, PermissionGuard, BullmqJobBroker, JobsRepository, JobsService],
  exports: [BullmqJobBroker, JobsService],
})
export class JobsModule {}
