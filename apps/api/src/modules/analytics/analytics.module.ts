import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { AnalyticsController } from './controller/analytics.controller';
import { AnalyticsRepository } from './repository/analytics.repository';
import { AnalyticsService } from './service/analytics.service';

@Module({
  imports: [BillingModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsRepository, AnalyticsService],
})
export class AnalyticsModule {}
