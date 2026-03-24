import { Module } from '@nestjs/common';
import { FamiliesModule } from './modules/families/families.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';

@Module({
  imports: [TeachersModule, StudentsModule, FamiliesModule],
})
export class AppModule {}
