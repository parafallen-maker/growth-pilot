import { Module } from '@nestjs/common';
import { JobsController } from './controller/jobs.controller';
import { JobsRepository } from './repository/jobs.repository';
import { JobsService } from './service/jobs.service';

@Module({
  controllers: [JobsController],
  providers: [JobsRepository, JobsService],
  exports: [JobsService],
})
export class JobsModule {}
