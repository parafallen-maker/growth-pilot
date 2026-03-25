import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { loadOptionalModule } from '../../../shared/runtime/load-optional-module';

type BullmqQueueLike = {
  add(
    name: string,
    data: object,
    options: { jobId: string; removeOnComplete: number; removeOnFail: number },
  ): Promise<unknown>;
  close(): Promise<void>;
};

type BullmqWorkerLike = {
  close(): Promise<void>;
};

type BullmqQueueCtor = new (
  name: string,
  options: {
    connection: unknown;
    defaultJobOptions: { removeOnComplete: number; removeOnFail: number };
  },
) => BullmqQueueLike;

type BullmqWorkerCtor = new (
  name: string,
  processor: (job: { data: unknown }) => Promise<unknown>,
  options: {
    connection: unknown;
    concurrency: number;
  },
) => BullmqWorkerLike;

type RedisCtor = new (url: string, options?: Record<string, unknown>) => { quit(): Promise<'OK' | void> };

interface BullmqRuntime {
  Queue: BullmqQueueCtor;
  Worker: BullmqWorkerCtor;
  Redis: RedisCtor;
}

@Injectable()
export class BullmqJobBroker implements OnModuleDestroy {
  private readonly queues = new Map<string, BullmqQueueLike>();
  private readonly workers: BullmqWorkerLike[] = [];
  private readonly connections: Array<{ quit(): Promise<'OK' | void> }> = [];
  private runtimePromise?: Promise<BullmqRuntime | null>;

  async enqueue(queueName: string, jobName: string, jobId: string, data: object) {
    if ((process.env.JOB_QUEUE_DRIVER ?? 'inline') !== 'bullmq') {
      return false;
    }

    const queue = await this.getQueue(queueName);
    await queue.add(jobName, data, {
      jobId,
      removeOnComplete: Number(process.env.JOB_QUEUE_REMOVE_ON_COMPLETE ?? 1000),
      removeOnFail: Number(process.env.JOB_QUEUE_REMOVE_ON_FAIL ?? 1000),
    });
    return true;
  }

  async registerWorker(
    queueName: string,
    processor: (data: unknown) => Promise<unknown>,
    concurrency = Number(process.env.JOB_QUEUE_WORKER_CONCURRENCY ?? 2),
  ) {
    if ((process.env.JOB_QUEUE_DRIVER ?? 'inline') !== 'bullmq') {
      return false;
    }

    const runtime = await this.getRuntimeOrThrow();
    const worker = new runtime.Worker(
      queueName,
      async (job) => processor(job.data),
      {
        connection: this.createConnection(runtime.Redis),
        concurrency,
      },
    );
    this.workers.push(worker);
    return true;
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all(Array.from(this.queues.values(), (queue) => queue.close()));
    await Promise.all(this.connections.map((connection) => connection.quit()));
  }

  private async getQueue(queueName: string) {
    const existing = this.queues.get(queueName);
    if (existing) {
      return existing;
    }

    const runtime = await this.getRuntimeOrThrow();
    const queue = new runtime.Queue(queueName, {
      connection: this.createConnection(runtime.Redis),
      defaultJobOptions: {
        removeOnComplete: Number(process.env.JOB_QUEUE_REMOVE_ON_COMPLETE ?? 1000),
        removeOnFail: Number(process.env.JOB_QUEUE_REMOVE_ON_FAIL ?? 1000),
      },
    });
    this.queues.set(queueName, queue);
    return queue;
  }

  private async getRuntimeOrThrow() {
    const runtime = await this.getRuntime();
    if (!runtime) {
      throw new Error('BullMQ driver requested but bullmq/ioredis or REDIS_URL is not available');
    }
    return runtime;
  }

  private async getRuntime(): Promise<BullmqRuntime | null> {
    if (!this.runtimePromise) {
      this.runtimePromise = this.loadRuntime();
    }
    return this.runtimePromise;
  }

  private async loadRuntime(): Promise<BullmqRuntime | null> {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) {
      return null;
    }

    const [bullmqModule, redisModule] = await Promise.all([
      loadOptionalModule<{ Queue?: BullmqQueueCtor; Worker?: BullmqWorkerCtor }>('bullmq'),
      loadOptionalModule<{ default?: RedisCtor }>('ioredis'),
    ]);

    const Queue = bullmqModule?.Queue;
    const Worker = bullmqModule?.Worker;
    const Redis = redisModule?.default;

    if (!Queue || !Worker || !Redis) {
      return null;
    }

    return { Queue, Worker, Redis };
  }

  private createConnection(Redis: RedisCtor) {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) {
      throw new Error('REDIS_URL is required for BullMQ queue driver');
    }

    const connection = new Redis(redisUrl, {
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
    this.connections.push(connection);
    return connection;
  }
}
