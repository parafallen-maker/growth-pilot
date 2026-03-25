import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { JobsController } from './controller/jobs.controller';
import { JobsRepository } from './repository/jobs.repository';
import { JobsService } from './service/jobs.service';

@Module({
  imports: [AuthModule],
  controllers: [JobsController],
  providers: [ApiAuthGuard, PermissionGuard, JobsRepository, JobsService],
  exports: [JobsService],
})
export class JobsModule {}
