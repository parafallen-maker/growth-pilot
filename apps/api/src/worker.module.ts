import { Module } from '@nestjs/common';
import { GrowthModule } from './modules/growth/growth.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [JobsModule, HomeworkModule, GrowthModule],
})
export class WorkerModule {}
