import { Injectable } from '@nestjs/common';
import { BillingRepository } from '../../billing/repository/billing.repository';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly billingRepository: BillingRepository) {}

  listContracts() { return this.billingRepository.listContracts(); }
  listInvoices() { return this.billingRepository.listInvoices(); }
  listPayments() { return this.billingRepository.listPayments(); }
  listRefunds() { return this.billingRepository.listRefunds(); }
  listRenewals() { return this.billingRepository.listRenewals(); }
}
