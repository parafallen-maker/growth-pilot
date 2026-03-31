import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { InMemoryRateLimitGuard, PasswordService, SensitiveDataInterceptor } from './common/security';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { FamiliesModule } from './modules/families/families.module';
import { FilesModule } from './modules/files/files.module';
import { GrowthModule } from './modules/growth/growth.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { HealthModule } from './modules/health/health.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    AnalyticsModule,
    SettingsModule,
    JobsModule,
    TeachersModule,
    StudentsModule,
    FamiliesModule,
    FilesModule,
    HealthModule,
    HomeworkModule,
    AttendanceModule,
    BillingModule,
    CommunicationModule,
    TasksModule,
    AlertsModule,
    GrowthModule,
  ],
  providers: [
    PasswordService,
    {
      provide: APP_GUARD,
      inject: [Reflector],
      useFactory: (reflector: Reflector) => new InMemoryRateLimitGuard(reflector),
    },
    {
      provide: APP_INTERCEPTOR,
      inject: [Reflector],
      useFactory: (reflector: Reflector) => new SensitiveDataInterceptor(reflector),
    },
  ],
})
export class AppModule {}
