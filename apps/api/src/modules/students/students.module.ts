import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { StudentsController } from './students.controller';
import { StudentsRepository } from './repository/students.repository';
import { StudentsService } from './students.service';

@Module({
  imports: [MasterDataModule, FamiliesModule],
  controllers: [StudentsController],
  providers: [StudentsRepository, StudentsService],
  exports: [StudentsRepository, StudentsService],
})
export class StudentsModule {}
