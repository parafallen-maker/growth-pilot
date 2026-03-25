import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ReportDraftJob } from './modules/growth/job/report-draft.job';
import { HomeworkAnalysisQueue } from './modules/homework/job/homework-analysis.queue';
import { BullmqJobBroker } from './modules/jobs/queue/bullmq-job-broker';
import { GROWTH_REPORT_DRAFT_QUEUE, HOMEWORK_ANALYSIS_QUEUE } from './modules/jobs/queue/job-queue.constants';
import { GrowthReportDraftJobPayload, HomeworkAnalysisJobPayload } from './modules/jobs/queue/job-queue.types';
import { WorkerModule } from './worker.module';

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  });

  const broker = app.get(BullmqJobBroker);
  const homeworkAnalysisQueue = app.get(HomeworkAnalysisQueue);
  const reportDraftJob = app.get(ReportDraftJob);

  const registrations = await Promise.all([
    broker.registerWorker(HOMEWORK_ANALYSIS_QUEUE, async (data) => {
      await homeworkAnalysisQueue.executeQueuedJob(data as HomeworkAnalysisJobPayload);
    }),
    broker.registerWorker(GROWTH_REPORT_DRAFT_QUEUE, async (data) => {
      await reportDraftJob.executeQueuedJob(data as GrowthReportDraftJobPayload);
    }),
  ]);

  if (!registrations.some(Boolean)) {
    console.warn('No BullMQ workers started because JOB_QUEUE_DRIVER is not set to bullmq.');
  } else {
    console.log('BullMQ workers started for homework-analysis and growth-report-draft queues.');
  }

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

void bootstrapWorker();
