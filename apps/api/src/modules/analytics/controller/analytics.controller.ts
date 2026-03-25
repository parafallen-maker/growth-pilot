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
  getOverview(@Query() query: AnalyticsQueryDto) {
    return ok(this.analyticsService.getOverview(query));
  }

  @Get('teaching')
  @RequirePermission('analytics:teaching:view')
  getTeaching(@Query() query: AnalyticsQueryDto) {
    return ok(this.analyticsService.getTeaching(query));
  }

  @Get('billing')
  @RequirePermission('analytics:billing:view')
  getBilling(@Query() query: AnalyticsQueryDto) {
    return ok(this.analyticsService.getBilling(query));
  }
}
