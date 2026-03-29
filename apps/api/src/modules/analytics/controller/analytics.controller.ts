import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { PermissionGuard } from '../../../common/permission.guard';
import { RequirePermission } from '../../../common/permission.decorator';
import { ok } from '../../../common/api-response';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { AnalyticsService } from '../service/analytics.service';

@Controller('analytics')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @RequirePermission('analytics:overview:view')
  async getOverview(@Query() query: AnalyticsQueryDto) {
    return ok(await this.analyticsService.getOverview(query));
  }

  @Get('teaching')
  @RequirePermission('analytics:teaching:view')
  async getTeaching(@Query() query: AnalyticsQueryDto) {
    return ok(await this.analyticsService.getTeaching(query));
  }

  @Get('teacher-workbench')
  @RequirePermission('analytics:teaching:view')
  async getTeacherWorkbench(@Query() query: AnalyticsQueryDto) {
    return ok(await this.analyticsService.getTeacherWorkbench(query));
  }

  @Get('billing')
  @RequirePermission('analytics:billing:view')
  async getBilling(@Query() query: AnalyticsQueryDto) {
    return ok(await this.analyticsService.getBilling(query));
  }
}
