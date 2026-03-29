import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { BillingModule } from '../billing/billing.module';
import { CommunicationModule } from '../communication/communication.module';
import { HomeworkModule } from '../homework/homework.module';
import { AlertsModule } from '../alerts/alerts.module';
import { TasksModule } from '../tasks/tasks.module';
import { AnalyticsController } from './controller/analytics.controller';
import { AnalyticsRepository } from './repository/analytics.repository';
import { AnalyticsService } from './service/analytics.service';

@Module({
  imports: [AuthModule, BillingModule, CommunicationModule, AttendanceModule, HomeworkModule, TasksModule, AlertsModule],
  controllers: [AnalyticsController],
  providers: [ApiAuthGuard, PermissionGuard, AnalyticsRepository, AnalyticsService],
})
export class AnalyticsModule {}
