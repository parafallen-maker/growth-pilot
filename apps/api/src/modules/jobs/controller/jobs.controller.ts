import { Controller, Get, Param } from '@nestjs/common';
import { buildApiResponse } from '../../../shared/api-response';
import { JobsService } from '../service/jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get(':jobId')
  getJob(@Param('jobId') jobId: string) {
    return buildApiResponse(this.jobsService.getJob(jobId));
  }
}
