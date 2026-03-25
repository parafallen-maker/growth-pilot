import { Module } from '@nestjs/common';
import { ApiAuthGuard } from './common/auth.guard';
import { PermissionGuard } from './common/permission.guard';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { FamiliesModule } from './modules/families/families.module';
import { FilesModule } from './modules/files/files.module';
import { GrowthModule } from './modules/growth/growth.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AuthModule,
    AnalyticsModule,
    UsersModule,
    SettingsModule,
    JobsModule,
    TeachersModule,
    StudentsModule,
    FamiliesModule,
    FilesModule,
    HomeworkModule,
    AttendanceModule,
    BillingModule,
    CommunicationModule,
    GrowthModule,
  ],
  providers: [ApiAuthGuard, PermissionGuard],
})
export class AppModule {}
