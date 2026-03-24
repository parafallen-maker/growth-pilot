import { Controller, Get, Param, Query } from '@nestjs/common';
import { buildApiResponse } from '../../../shared/api-response';
import { JobsService } from '../service/jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  listJobs(
    @Query('status') status?: string,
    @Query('jobType') jobType?: string,
    @Query('bizType') bizType?: string,
  ) {
    return buildApiResponse(this.jobsService.listJobs({ status, jobType, bizType }));
  }

  @Get(':jobId')
  getJob(@Param('jobId') jobId: string) {
    return buildApiResponse(this.jobsService.getJob(jobId));
  }
}
