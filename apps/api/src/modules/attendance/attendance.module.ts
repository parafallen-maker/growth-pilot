import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { AttendanceController } from './controller/attendance.controller';
import { AttendanceRepository } from './repository/attendance.repository';
import { AttendanceService } from './service/attendance.service';

@Module({
  imports: [AuthModule],
  controllers: [AttendanceController],
  providers: [ApiAuthGuard, PermissionGuard, AttendanceRepository, AttendanceService],
  exports: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}
