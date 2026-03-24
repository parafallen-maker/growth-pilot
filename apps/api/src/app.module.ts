import { Module } from '@nestjs/common';
import { FamiliesModule } from './modules/families/families.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';

@Module({
  imports: [JobsModule, TeachersModule, StudentsModule, FamiliesModule, HomeworkModule],
})
export class AppModule {}
