import { Module } from '@nestjs/common';
import { MasterDataModule } from '../master-data/master-data.module';
import { TeachersController } from './teachers.controller';
import { TeachersRepository } from './repository/teachers.repository';
import { TeachersService } from './teachers.service';

@Module({
  imports: [MasterDataModule],
  controllers: [TeachersController],
  providers: [TeachersRepository, TeachersService],
  exports: [TeachersRepository, TeachersService],
})
export class TeachersModule {}
