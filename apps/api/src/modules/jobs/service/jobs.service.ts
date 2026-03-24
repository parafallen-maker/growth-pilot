import { Injectable, NotFoundException } from '@nestjs/common';
import { JobsRepository } from '../repository/jobs.repository';

@Injectable()
export class JobsService {
  constructor(private readonly jobsRepository: JobsRepository) {}

  getJob(jobId: string) {
    const job = this.jobsRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException('job not found');
    }

    return job;
  }
}
