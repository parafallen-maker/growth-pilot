import { Injectable } from '@nestjs/common';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { AnalyticsRepository } from '../repository/analytics.repository';

type RenewalStatus = 'todo' | 'contacting' | 'won' | 'lost' | 'closed';
type RenewalRecord = { id: string; campusId?: string | null; termId?: string | null; status: RenewalStatus; expectedEndDate?: string | null; nextFollowUpAt?: string | null };

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async getOverview(query: AnalyticsQueryDto) {
    const contracts = await this.filterContractsByScope(query);
    const invoices = await this.filterInvoicesByScope(query);
    const payments = await this.filterPaymentsByScope(query);
    const homework = await this.filterHomeworkSubmissionsByScope(query);
    const attendanceEvents = await this.filterAttendanceEventsByScope(query);
    const communicationRecords = await this.filterCommunicationRecordsByScope(query);
    const messageTasks = await this.filterMessageTasksByScope(query);
    const renewals = await this.filterRenewalsByScope(query);

    const receivableCents = invoices.reduce((sum, item) => sum + item.amountCents, 0);
    const receivedCents = payments.filter((item) => item.status === 'success').reduce((sum, item) => sum + item.paidAmountCents, 0);
    const publishedHomeworkCount = homework.filter((item) => item.reviewStatus === 'reviewed' || item.reviewStatus === 'published').length;

    return {
      activeStudentCount: new Set(contracts.filter((item) => item.status === 'active').map((item) => item.studentId)).size,
      pendingHomeworkCount: homework.filter((item) => item.reviewStatus === 'unreviewed' || item.reviewStatus === 'reviewing').length,
      reportPublishRate: homework.length ? Number((publishedHomeworkCount / homework.length).toFixed(4)) : 0,
      receivableCents,
      receivedCents,
      todayAttendanceAnomalyCount: this.countAttendanceAnomalies(attendanceEvents),
      trend: {
        receivableCents,
        receivedCents,
        renewalTodoCount: renewals.filter((item) => item.status === 'todo').length,
        communicationTouchCount: communicationRecords.length,
        messageFailureCount: messageTasks.filter((item) => item.status === 'failed').length,
      },
    };
  }

  async getTeaching(query: AnalyticsQueryDto) {
    const homework = await this.filterHomeworkSubmissionsByScope(query);
    const homeworkDailyStats = await this.filterHomeworkDailyStatsByScope(query);
    const communicationRecords = await this.filterCommunicationRecordsByScope(query);

    const teacherIds = new Set(homework.map((item) => item.teacherId).filter(Boolean) as string[]);
    if (query.teacherId) teacherIds.add(query.teacherId);

    const teacherWorkloads = [...teacherIds].map((teacherId) => {
      const teacherHomework = homework.filter((item) => item.teacherId === teacherId);
      return {
        teacherId,
        teacherName: teacherId,
        pendingReviewCount: teacherHomework.filter((item) => item.reviewStatus === 'unreviewed' || item.reviewStatus === 'reviewing').length,
        activeStudentCount: new Set(teacherHomework.map((item) => item.studentId)).size,
        communicationCount: communicationRecords.filter((item) => item.studentId && teacherHomework.some((submission) => submission.studentId === item.studentId)).length,
      };
    });

    const subjectAccuracyMap = new Map<string, { total: number; count: number }>();
    for (const item of homework) {
      if (typeof item.finalAccuracyPct !== 'number') continue;
      const acc = subjectAccuracyMap.get(item.subject) ?? { total: 0, count: 0 };
      acc.total += item.finalAccuracyPct;
      acc.count += 1;
      subjectAccuracyMap.set(item.subject, acc);
    }

    const errorCounter = new Map<string, number>();
    for (const item of homework) {
      for (const token of (item.finalErrorSummary ?? '').split(/[、,，\s]+/).map((part) => part.trim()).filter(Boolean)) {
        errorCounter.set(token, (errorCounter.get(token) ?? 0) + 1);
      }
    }

    const growthCoverageMap = new Map<string, { totalMinutes: number; sessionCount: number }>();
    for (const stat of homeworkDailyStats) {
      const current = growthCoverageMap.get(stat.subject) ?? { totalMinutes: 0, sessionCount: 0 };
      current.totalMinutes += stat.totalMinutes;
      current.sessionCount += stat.sessionCount;
      growthCoverageMap.set(stat.subject, current);
    }

    return {
      teacherWorkloads,
      subjectAccuracy: [...subjectAccuracyMap.entries()].map(([subject, data]) => ({ subject, avgAccuracyPct: Number((data.total / data.count).toFixed(2)), sampleCount: data.count })),
      topErrors: [...errorCounter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count]) => ({ label, count })),
      growthCoverage: [...growthCoverageMap.entries()].map(([subject, data]) => ({ subject, totalMinutes: data.totalMinutes, sessionCount: data.sessionCount })),
      filtersApplied: this.scope(query),
      dataSource: {
        homeworkSubmissionCount: homework.length,
        communicationRecordCount: communicationRecords.length,
        homeworkDailyStatCount: homeworkDailyStats.length,
        mode: 'repository-aggregated',
      },
    };
  }

  async getBilling(query: AnalyticsQueryDto) {
    const contracts = await this.filterContractsByScope(query);
    const invoices = await this.filterInvoicesByScope(query);
    const payments = await this.filterPaymentsByScope(query);
    const refunds = await this.filterRefundsByScope(query);
    const renewals = await this.filterRenewalsByScope(query);
    const records = await this.filterCommunicationRecordsByScope(query);
    const tasks = await this.filterMessageTasksByScope(query);

    const paymentById = new Map(payments.map((item) => [item.id, item]));
    const receivedByInvoiceId = new Map<string, number>();
    for (const payment of payments) receivedByInvoiceId.set(payment.invoiceId, (receivedByInvoiceId.get(payment.invoiceId) ?? 0) + payment.paidAmountCents);
    for (const refund of refunds) {
      const payment = paymentById.get(refund.paymentId);
      if (!payment) continue;
      receivedByInvoiceId.set(payment.invoiceId, (receivedByInvoiceId.get(payment.invoiceId) ?? 0) - refund.refundAmountCents);
    }

    return {
      receivableTrend: this.groupAmountByDate(invoices.map((item) => ({ date: item.issueDate, amountCents: item.amountCents }))),
      receivedTrend: this.groupAmountByDate(payments.filter((item) => item.status === 'success').map((item) => ({ date: item.paymentTime.slice(0, 10), amountCents: item.paidAmountCents }))),
      agingSummary: [{
        bucket: 'current',
        invoiceCount: invoices.filter((item) => (receivedByInvoiceId.get(item.id) ?? 0) < item.amountCents).length,
        outstandingCents: invoices.reduce((sum, item) => sum + Math.max(item.amountCents - (receivedByInvoiceId.get(item.id) ?? 0), 0), 0),
      }],
      renewalFunnel: this.countRenewalStatuses(renewals),
      filtersApplied: this.scope(query),
      contractCount: contracts.length,
      communicationTouchCount: records.length,
      messageTaskCount: tasks.length,
    };
  }

  private async filterPaymentsByScope(query: AnalyticsQueryDto) {
    const invoices = await this.filterInvoicesByScope(query);
    const invoiceIds = new Set(invoices.map((item) => item.id));
    return (await this.analyticsRepository.listPayments()).filter((item) => invoiceIds.has(item.invoiceId) && this.matchDate(item.paymentTime.slice(0, 10), query.dateFrom, query.dateTo));
  }

  private async filterRefundsByScope(query: AnalyticsQueryDto) {
    const payments = await this.filterPaymentsByScope(query);
    const paymentIds = new Set(payments.map((item) => item.id));
    return (await this.analyticsRepository.listRefunds()).filter((item) => paymentIds.has(item.paymentId) && this.matchDate(item.refundTime.slice(0, 10), query.dateFrom, query.dateTo));
  }

  private async filterRenewalsByScope(query: AnalyticsQueryDto): Promise<RenewalRecord[]> {
    return (await this.analyticsRepository.listRenewals()).filter((item) => {
      if (query.campusId && item.campusId !== query.campusId) return false;
      if (query.termId && item.termId !== query.termId) return false;
      const date = item.expectedEndDate ?? item.nextFollowUpAt?.slice(0, 10) ?? null;
      return this.matchDate(date, query.dateFrom, query.dateTo);
    });
  }

  private async filterContractsByScope(query: AnalyticsQueryDto) {
    return (await this.analyticsRepository.listContracts()).filter((item) => {
      if (query.campusId && item.campusId !== query.campusId) return false;
      if (query.termId && item.termId !== query.termId) return false;
      return this.matchDate(item.startDate, query.dateFrom, query.dateTo);
    });
  }

  private async filterInvoicesByScope(query: AnalyticsQueryDto) {
    const contractById = new Map((await this.analyticsRepository.listContracts()).map((item) => [item.id, item]));
    return (await this.analyticsRepository.listInvoices()).filter((item) => {
      const contract = item.contractId ? contractById.get(item.contractId) : undefined;
      if (query.campusId && contract?.campusId !== query.campusId) return false;
      if (query.termId && contract?.termId !== query.termId) return false;
      return this.matchDate(item.issueDate, query.dateFrom, query.dateTo);
    });
  }

  private async filterHomeworkSubmissionsByScope(query: AnalyticsQueryDto) {
    const contractStudents = new Set((await this.filterContractsByScope(query)).map((item) => item.studentId));
    return (await this.analyticsRepository.listHomeworkSubmissions()).filter((item) => {
      if (contractStudents.size && !contractStudents.has(item.studentId)) return false;
      return this.matchDate(item.homeworkDate, query.dateFrom, query.dateTo) && (!query.teacherId || item.teacherId === query.teacherId);
    });
  }

  private async filterAttendanceEventsByScope(query: AnalyticsQueryDto) {
    const contractStudents = new Set((await this.filterContractsByScope(query)).map((item) => item.studentId));
    return (await this.analyticsRepository.listAttendanceEvents()).filter((item) => {
      if (query.campusId && item.campusId !== query.campusId) return false;
      if (contractStudents.size && !contractStudents.has(item.studentId)) return false;
      return this.matchDate(item.eventTime.slice(0, 10), query.dateFrom, query.dateTo);
    });
  }

  private async filterHomeworkDailyStatsByScope(query: AnalyticsQueryDto) {
    const contractStudents = new Set((await this.filterContractsByScope(query)).map((item) => item.studentId));
    return (await this.analyticsRepository.listHomeworkDailyStats()).filter((item) => (!contractStudents.size || contractStudents.has(item.studentId)) && this.matchDate(item.statDate, query.dateFrom, query.dateTo));
  }

  private async filterCommunicationRecordsByScope(query: AnalyticsQueryDto) {
    const contractStudents = new Set((await this.filterContractsByScope(query)).map((item) => item.studentId));
    return (await this.analyticsRepository.listCommunicationRecords()).filter((item) => (!item.studentId || !contractStudents.size || contractStudents.has(item.studentId)) && this.matchDate(item.createdAt.slice(0, 10), query.dateFrom, query.dateTo));
  }

  private async filterMessageTasksByScope(query: AnalyticsQueryDto) {
    const contractStudents = new Set((await this.filterContractsByScope(query)).map((item) => item.studentId));
    return (await this.analyticsRepository.listMessageTasks()).filter((item) => (!item.studentId || !contractStudents.size || contractStudents.has(item.studentId)) && this.matchDate((item.sentAt ?? item.scheduledAt ?? item.createdAt).slice(0, 10), query.dateFrom, query.dateTo));
  }

  private countAttendanceAnomalies(events: Awaited<ReturnType<AnalyticsRepository['listAttendanceEvents']>>) {
    const grouped = new Map<string, Set<string>>();
    for (const event of events) {
      const key = `${event.studentId}|${event.eventTime.slice(0, 10)}`;
      const set = grouped.get(key) ?? new Set<string>();
      set.add(event.eventType);
      grouped.set(key, set);
    }
    return [...grouped.values()].filter((types) => !(types.has('checkin') && types.has('checkout'))).length;
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
    for (const item of items) grouped.set(item.date, (grouped.get(item.date) ?? 0) + item.amountCents);
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amountCents]) => ({ date, amountCents }));
  }

  private countRenewalStatuses(renewals: RenewalRecord[]) {
    const statuses: RenewalStatus[] = ['todo', 'contacting', 'won', 'lost', 'closed'];
    return statuses.map((status) => ({ status, count: renewals.filter((item) => item.status === status).length }));
  }

  private scope(query: AnalyticsQueryDto) {
    return { campusId: query.campusId ?? null, termId: query.termId ?? null, dateFrom: query.dateFrom ?? null, dateTo: query.dateTo ?? null };
  }
}
