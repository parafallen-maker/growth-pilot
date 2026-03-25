import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { PermissionGuard } from '../../../common/permission.guard';
import { RequirePermission } from '../../../common/permission.decorator';
import { buildApiResponse } from '../../../shared/api-response';
import { JobsService } from '../service/jobs.service';

@Controller('jobs')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @RequirePermission('jobs.read')
  listJobs(
    @Query('status') status?: string,
    @Query('jobType') jobType?: string,
    @Query('bizType') bizType?: string,
  ) {
    return buildApiResponse(this.jobsService.listJobs({ status, jobType, bizType }));
  }

  @Get(':jobId')
  @RequirePermission('jobs.read')
  getJob(@Param('jobId') jobId: string) {
    return buildApiResponse(this.jobsService.getJob(jobId));
  }
}
