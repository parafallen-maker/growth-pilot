import { Controller, Get, Query } from '@nestjs/common';
import { ok } from '../../../common/api-response';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { AnalyticsService } from '../service/analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(@Query() query: AnalyticsQueryDto) {
    return ok(this.analyticsService.getOverview(query));
  }

  @Get('teaching')
  getTeaching(@Query() query: AnalyticsQueryDto) {
    return ok(this.analyticsService.getTeaching(query));
  }

  @Get('billing')
  getBilling(@Query() query: AnalyticsQueryDto) {
    return ok(this.analyticsService.getBilling(query));
  }
}
