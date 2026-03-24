import { Module } from '@nestjs/common';
import { FamiliesModule } from './modules/families/families.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { GrowthModule } from './modules/growth/growth.module';

@Module({
  imports: [TeachersModule, StudentsModule, FamiliesModule, GrowthModule],
})
export class AppModule {}
