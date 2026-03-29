import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { FilesService } from '../files/service/files.service';
import { JobsModule } from '../jobs/jobs.module';
import { BullmqJobBroker } from '../jobs/queue/bullmq-job-broker';
import { JobsService } from '../jobs/service/jobs.service';
import { HOMEWORK_ANALYSIS_ADAPTER, HomeworkAnalysisAdapter } from './adapter/homework-analysis.adapter';
import { resolveHomeworkAiProvider } from './adapter/homework-analysis-config';
import { MockHomeworkAnalysisAdapter } from './adapter/mock-homework-analysis.adapter';
import { OpenAiCompatibleHomeworkAnalysisAdapter } from './adapter/openai-compatible-homework-analysis.adapter';
import { HomeworkController } from './controller/homework.controller';
import { HomeworkEventPublisher } from './event/homework-event.publisher';
import { HomeworkAnalysisQueue } from './job/homework-analysis.queue';
import { HomeworkRepository } from './repository/homework.repository';
import { HomeworkService } from './service/homework.service';

@Module({
  imports: [AuthModule, JobsModule, FilesModule],
  controllers: [HomeworkController],
  providers: [ApiAuthGuard, PermissionGuard,
    HomeworkRepository,
    HomeworkService,
    HomeworkEventPublisher,
    MockHomeworkAnalysisAdapter,
    OpenAiCompatibleHomeworkAnalysisAdapter,
    {
      provide: HOMEWORK_ANALYSIS_ADAPTER,
      inject: [MockHomeworkAnalysisAdapter, OpenAiCompatibleHomeworkAnalysisAdapter],
      useFactory: (
        mockAdapter: MockHomeworkAnalysisAdapter,
        openAiCompatibleAdapter: OpenAiCompatibleHomeworkAnalysisAdapter,
      ) => (resolveHomeworkAiProvider() === 'mock' ? mockAdapter : openAiCompatibleAdapter),
    },
    {
      provide: HomeworkAnalysisQueue,
      inject: [JobsService, HomeworkRepository, FilesService, HOMEWORK_ANALYSIS_ADAPTER, BullmqJobBroker],
      useFactory: (
        jobsService: JobsService,
        homeworkRepository: HomeworkRepository,
        filesService: FilesService,
        homeworkAnalysisAdapter: HomeworkAnalysisAdapter,
        bullmqJobBroker: BullmqJobBroker,
      ) => new HomeworkAnalysisQueue(jobsService, homeworkRepository, filesService, homeworkAnalysisAdapter, bullmqJobBroker),
    },
  ],
  exports: [HomeworkService, HomeworkRepository, HomeworkEventPublisher],
})
export class HomeworkModule {}
