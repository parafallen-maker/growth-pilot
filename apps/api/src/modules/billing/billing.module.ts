import { Module } from '@nestjs/common';
import { BillingController } from './controller/billing.controller';
import { BillingRepository } from './repository/billing.repository';
import { BillingService } from './service/billing.service';

@Module({
  controllers: [BillingController],
  providers: [BillingRepository, BillingService],
  exports: [BillingService, BillingRepository],
})
export class BillingModule {}
