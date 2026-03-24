import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { HOMEWORK_ANALYSIS_ADAPTER } from './adapter/homework-analysis.adapter';
import { MockHomeworkAnalysisAdapter } from './adapter/mock-homework-analysis.adapter';
import { HomeworkController } from './controller/homework.controller';
import { HomeworkEventPublisher } from './event/homework-event.publisher';
import { HomeworkAnalysisQueue } from './job/homework-analysis.queue';
import { HomeworkRepository } from './repository/homework.repository';
import { HomeworkService } from './service/homework.service';

@Module({
  imports: [JobsModule],
  controllers: [HomeworkController],
  providers: [
    HomeworkRepository,
    HomeworkService,
    HomeworkAnalysisQueue,
    HomeworkEventPublisher,
    MockHomeworkAnalysisAdapter,
    {
      provide: HOMEWORK_ANALYSIS_ADAPTER,
      useExisting: MockHomeworkAnalysisAdapter,
    },
  ],
  exports: [HomeworkService, HomeworkRepository, HomeworkEventPublisher],
})
export class HomeworkModule {}
