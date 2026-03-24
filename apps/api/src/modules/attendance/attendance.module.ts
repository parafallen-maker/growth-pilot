import { Module } from '@nestjs/common';
import { AttendanceController } from './controller/attendance.controller';
import { AttendanceRepository } from './repository/attendance.repository';
import { AttendanceService } from './service/attendance.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceRepository, AttendanceService],
  exports: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}
