import { Injectable } from '@nestjs/common';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { AnalyticsRepository } from '../repository/analytics.repository';

type RenewalStatus = 'todo' | 'contacting' | 'won' | 'lost' | 'closed';

type RenewalRecord = {
  id: string;
  campusId?: string | null;
  termId?: string | null;
  status: RenewalStatus;
  expectedEndDate?: string | null;
  nextFollowUpAt?: string | null;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  getOverview(query: AnalyticsQueryDto) {
    const contracts = this.filterContractsByScope(query);
    const invoices = this.filterInvoicesByScope(query);
    const payments = this.filterPaymentsByScope(query);
    const renewals = this.filterRenewalsByScope(query);

    const receivableCents = invoices.reduce((sum, item) => sum + item.amountCents, 0);
    const receivedCents = payments.reduce((sum, item) => sum + item.paidAmountCents, 0);

    return {
      activeStudentCount: new Set(contracts.filter((item) => item.status === 'active').map((item) => item.studentId)).size,
      pendingHomeworkCount: 0,
      reportPublishRate: 0,
      receivableCents,
      receivedCents,
      todayAttendanceAnomalyCount: 0,
      trend: {
        receivableCents,
        receivedCents,
        renewalTodoCount: renewals.filter((item) => item.status === 'todo').length,
      },
    };
  }

  getTeaching(query: AnalyticsQueryDto) {
    const renewals = this.filterRenewalsByScope(query);
    return {
      teacherWorkloads: query.teacherId
        ? [{ teacherId: query.teacherId, teacherName: 'mock-teacher', pendingReviewCount: 0, activeStudentCount: 0 }]
        : [],
      subjectAccuracy: [],
      topErrors: [],
      growthCoverage: [],
      filtersApplied: this.scope(query),
      dataSource: {
        renewalsInScope: renewals.length,
        mode: 'mock-in-memory-skeleton',
      },
    };
  }

  getBilling(query: AnalyticsQueryDto) {
    const contracts = this.filterContractsByScope(query);
    const invoices = this.filterInvoicesByScope(query);
    const payments = this.filterPaymentsByScope(query);
    const refunds = this.filterRefundsByScope(query);
    const renewals = this.filterRenewalsByScope(query);

    const receivedByInvoiceId = new Map<string, number>();
    for (const payment of payments) {
      receivedByInvoiceId.set(payment.invoiceId, (receivedByInvoiceId.get(payment.invoiceId) ?? 0) + payment.paidAmountCents);
    }
    for (const refund of refunds) {
      const payment = this.analyticsRepository.listPayments().find((item) => item.id === refund.paymentId);
      if (!payment) continue;
      receivedByInvoiceId.set(payment.invoiceId, (receivedByInvoiceId.get(payment.invoiceId) ?? 0) - refund.refundAmountCents);
    }

    return {
      receivableTrend: this.groupAmountByDate(invoices.map((item) => ({ date: item.issueDate, amountCents: item.amountCents }))),
      receivedTrend: this.groupAmountByDate(payments.map((item) => ({ date: item.paymentTime.slice(0, 10), amountCents: item.paidAmountCents }))),
      agingSummary: [
        {
          bucket: 'current',
          invoiceCount: invoices.filter((item) => (receivedByInvoiceId.get(item.id) ?? 0) < item.amountCents).length,
          outstandingCents: invoices.reduce((sum, item) => sum + Math.max(item.amountCents - (receivedByInvoiceId.get(item.id) ?? 0), 0), 0),
        },
      ],
      renewalFunnel: this.countRenewalStatuses(renewals),
      filtersApplied: this.scope(query),
      contractCount: contracts.length,
    };
  }

  private filterPaymentsByScope(query: AnalyticsQueryDto) {
    const invoices = this.filterInvoicesByScope(query);
    const invoiceIds = new Set(invoices.map((item) => item.id));
    return this.analyticsRepository.listPayments().filter((item) => {
      if (!invoiceIds.has(item.invoiceId)) return false;
      const date = item.paymentTime.slice(0, 10);
      return this.matchDate(date, query.dateFrom, query.dateTo);
    });
  }

  private filterRefundsByScope(query: AnalyticsQueryDto) {
    const payments = this.filterPaymentsByScope(query);
    const paymentIds = new Set(payments.map((item) => item.id));
    return this.analyticsRepository.listRefunds().filter((item) => {
      if (!paymentIds.has(item.paymentId)) return false;
      const date = item.refundTime.slice(0, 10);
      return this.matchDate(date, query.dateFrom, query.dateTo);
    });
  }

  private filterRenewalsByScope(query: AnalyticsQueryDto): RenewalRecord[] {
    return this.analyticsRepository.listRenewals().filter((item) => {
      if (query.campusId && item.campusId !== query.campusId) return false;
      if (query.termId && item.termId !== query.termId) return false;
      const date = item.expectedEndDate ?? item.nextFollowUpAt?.slice(0, 10) ?? null;
      return this.matchDate(date, query.dateFrom, query.dateTo);
    });
  }

  private filterContractsByScope(query: AnalyticsQueryDto) {
    return this.analyticsRepository.listContracts().filter((item) => {
      if (query.campusId && item.campusId !== query.campusId) return false;
      if (query.termId && item.termId !== query.termId) return false;
      return this.matchDate(item.startDate, query.dateFrom, query.dateTo);
    });
  }

  private filterInvoicesByScope(query: AnalyticsQueryDto) {
    const contracts = this.analyticsRepository.listContracts();
    const contractById = new Map(contracts.map((item) => [item.id, item]));
    return this.analyticsRepository.listInvoices().filter((item) => {
      const contract = item.contractId ? contractById.get(item.contractId) : undefined;
      const campusId = contract?.campusId ?? null;
      const termId = contract?.termId ?? null;
      if (query.campusId && campusId !== query.campusId) return false;
      if (query.termId && termId !== query.termId) return false;
      return this.matchDate(item.issueDate, query.dateFrom, query.dateTo);
    });
  }

  private matchDate(date: string | null | undefined, dateFrom?: string, dateTo?: string) {
    if (!dateFrom && !dateTo) return true;
    if (!date) return false;
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    return true;
  }

  private groupAmountByDate(items: Array<{ date: string; amountCents: number }>) {
    const grouped = new Map<string, number>();
    for (const item of items) {
      grouped.set(item.date, (grouped.get(item.date) ?? 0) + item.amountCents);
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amountCents]) => ({ date, amountCents }));
  }

  private countRenewalStatuses(renewals: RenewalRecord[]) {
    const statuses: RenewalStatus[] = ['todo', 'contacting', 'won', 'lost', 'closed'];
    return statuses.map((status) => ({ status, count: renewals.filter((item) => item.status === status).length }));
  }

  private scope(query: AnalyticsQueryDto) {
    return {
      campusId: query.campusId ?? null,
      termId: query.termId ?? null,
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
    };
  }
}
