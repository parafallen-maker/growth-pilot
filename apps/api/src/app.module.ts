import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { FamiliesModule } from './modules/families/families.module';
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
    UsersModule,
    SettingsModule,
    JobsModule,
    TeachersModule,
    StudentsModule,
    FamiliesModule,
    HomeworkModule,
    GrowthModule,
  ],
})
export class AppModule {}
