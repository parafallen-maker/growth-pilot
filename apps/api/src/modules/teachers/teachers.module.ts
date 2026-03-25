import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { TeachersController } from './teachers.controller';
import { TeachersRepository } from './repository/teachers.repository';
import { TeachersService } from './teachers.service';

@Module({
  imports: [AuthModule, MasterDataModule],
  controllers: [TeachersController],
  providers: [ApiAuthGuard, PermissionGuard, TeachersRepository, TeachersService],
  exports: [TeachersRepository, TeachersService],
})
export class TeachersModule {}
