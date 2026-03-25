import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { AttendanceRepository } from '../attendance/repository/attendance.repository';
import { BillingRepository } from '../billing/repository/billing.repository';
import { FamiliesModule } from '../families/families.module';
import { GrowthRepository } from '../growth/repository/growth.repository';
import { HomeworkRepository } from '../homework/repository/homework.repository';
import { MasterDataModule } from '../master-data/master-data.module';
import { StudentsController } from './students.controller';
import { StudentsRepository } from './repository/students.repository';
import { StudentsService } from './students.service';

@Module({
  imports: [AuthModule, MasterDataModule, FamiliesModule],
  controllers: [StudentsController],
  providers: [ApiAuthGuard, PermissionGuard, 
    StudentsRepository,
    HomeworkRepository,
    GrowthRepository,
    AttendanceRepository,
    BillingRepository,
    StudentsService,
  ],
  exports: [StudentsRepository, StudentsService],
})
export class StudentsModule {}
