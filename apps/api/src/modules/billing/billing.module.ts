import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { BillingController } from './controller/billing.controller';
import { BillingRepository } from './repository/billing.repository';
import { BillingService } from './service/billing.service';

@Module({
  imports: [AuthModule],
  controllers: [BillingController],
  providers: [ApiAuthGuard, PermissionGuard, BillingRepository, BillingService],
  exports: [BillingService, BillingRepository],
})
export class BillingModule {}
