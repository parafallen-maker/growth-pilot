import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { BillingModule } from '../billing/billing.module';
import { CommunicationModule } from '../communication/communication.module';
import { HomeworkModule } from '../homework/homework.module';
import { AnalyticsController } from './controller/analytics.controller';
import { AnalyticsRepository } from './repository/analytics.repository';
import { AnalyticsService } from './service/analytics.service';

@Module({
  imports: [BillingModule, CommunicationModule, AttendanceModule, HomeworkModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsRepository, AnalyticsService],
})
export class AnalyticsModule {}
