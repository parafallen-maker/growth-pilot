import { Injectable } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { createDb } from '../../../db';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { AttendanceRepository } from '../../attendance/repository/attendance.repository';
import { BillingRepository } from '../../billing/repository/billing.repository';
import { CommunicationRepository } from '../../communication/repository/communication.repository';
import { HomeworkRepository } from '../../homework/repository/homework.repository';

type RenewalStatus = 'todo' | 'contacting' | 'won' | 'lost' | 'closed';

type OverviewAggregate = {
  activeStudentCount: number;
  pendingHomeworkCount: number;
  reportPublishRate: number;
  receivableCents: number;
  receivedCents: number;
  todayAttendanceAnomalyCount: number;
  trend: {
    receivableCents: number;
    receivedCents: number;
    renewalTodoCount: number;
    communicationTouchCount: number;
    messageFailureCount: number;
  };
};

type TeachingAggregate = {
  teacherWorkloads: Array<{
    teacherId: string;
    teacherName: string;
    pendingReviewCount: number;
    activeStudentCount: number;
    communicationCount: number;
  }>;
  subjectAccuracy: Array<{ subject: string; avgAccuracyPct: number; sampleCount: number }>;
  topErrors: Array<{ label: string; count: number }>;
  growthCoverage: Array<{ subject: string; totalMinutes: number; sessionCount: number }>;
  dataSource: {
    homeworkSubmissionCount: number;
    communicationRecordCount: number;
    homeworkDailyStatCount: number;
    mode: 'sql-aggregated';
  };
};

type BillingAggregate = {
  receivableTrend: Array<{ date: string; amountCents: number }>;
  receivedTrend: Array<{ date: string; amountCents: number }>;
  agingSummary: Array<{ bucket: 'current'; invoiceCount: number; outstandingCents: number }>;
  renewalFunnel: Array<{ status: RenewalStatus; count: number }>;
  contractCount: number;
  communicationTouchCount: number;
  messageTaskCount: number;
};

@Injectable()
export class AnalyticsRepository {
  private readonly db = isDbPersistenceEnabled() ? createDb() : null;

  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly communicationRepository: CommunicationRepository,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly homeworkRepository: HomeworkRepository,
  ) {}

  supportsSqlAggregation() {
    return this.db !== null;
  }

  listContracts() { return this.billingRepository.listContracts(); }
  listInvoices() { return this.billingRepository.listInvoices(); }
  listPayments() { return this.billingRepository.listPayments(); }
  listRefunds() { return this.billingRepository.listRefunds(); }
  listRenewals() { return this.billingRepository.listRenewals(); }
  listCommunicationRecords() { return this.communicationRepository.listRecords(); }
  listMessageTasks() { return this.communicationRepository.listMessageTasks(); }
  listAttendanceEvents() { return this.attendanceRepository.listEvents(); }
  listHomeworkDailyStats() { return this.attendanceRepository.listDailyStats(); }
  listHomeworkSubmissions() { return this.homeworkRepository.listSubmissions(); }

  async getOverviewAggregate(query: AnalyticsQueryDto): Promise<OverviewAggregate> {
    const contractScope = await this.getContractScope(query);
    const [invoiceTotals, paymentTotals, homeworkCounts, attendanceTotals, renewalTotals, communicationTotals, messageTotals] = await Promise.all([
      this.selectOne<{ receivable_cents: string | number | null }>(
        sql`
          select coalesce(sum(i.amount_cents), 0) as receivable_cents
          from invoices i
          ${this.joinScopedContracts('i.contract_id')}
          where ${this.joinConditions(this.invoiceScopeFilters(query, contractScope.contractIds))}
        `,
      ),
      this.selectOne<{ received_cents: string | number | null }>(
        sql`
          select coalesce(sum(p.paid_amount_cents), 0) as received_cents
          from payments p
          join invoices i on i.id = p.invoice_id
          ${this.joinScopedContracts('i.contract_id')}
          where ${this.joinConditions([
            sql`p.status = 'success'`,
            ...this.invoiceScopeFilters(query, contractScope.contractIds),
            ...this.timestampRangeFilters('p.payment_time', query.dateFrom, query.dateTo),
          ])}
        `,
      ),
      this.selectOne<{ total_count: string | number | null; pending_count: string | number | null; published_count: string | number | null }>(
        sql`
          select
            count(*) as total_count,
            count(*) filter (where h.review_status in ('unreviewed', 'reviewing')) as pending_count,
            count(*) filter (where h.review_status in ('reviewed', 'published')) as published_count
          from homework_submissions h
          where ${this.joinConditions(this.homeworkScopeFilters(query, contractScope.studentIds))}
        `,
      ),
      this.selectOne<{ anomaly_count: string | number | null }>(
        sql`
          select count(*) as anomaly_count
          from (
            select
              a.student_id,
              date(a.event_time) as stat_date,
              bool_or(a.event_type in ('checkin', 'manual_checkin')) as has_checkin,
              bool_or(a.event_type in ('checkout', 'manual_checkout')) as has_checkout
            from attendance_events a
            where ${this.joinConditions(this.attendanceScopeFilters(query, contractScope.studentIds))}
            group by a.student_id, date(a.event_time)
          ) grouped
          where not (grouped.has_checkin and grouped.has_checkout)
        `,
      ),
      this.selectOne<{ todo_count: string | number | null }>(
        sql`
          select count(*) filter (where r.status = 'todo') as todo_count
          from renewals r
          ${this.joinScopedContracts('r.contract_id')}
          where ${this.joinConditions(this.renewalScopeFilters(query, contractScope.contractIds))}
        `,
      ),
      this.selectOne<{ record_count: string | number | null }>(
        sql`
          select count(*) as record_count
          from communication_records c
          where ${this.joinConditions(this.communicationScopeFilters(query, contractScope.studentIds))}
        `,
      ),
      this.selectOne<{ failure_count: string | number | null }>(
        sql`
          select count(*) as failure_count
          from message_tasks m
          where ${this.joinConditions([
            ...this.messageTaskScopeFilters(query, contractScope.studentIds),
            sql`m.status = 'failed'`,
          ])}
        `,
      ),
    ]);

    const receivableCents = this.toNumber(invoiceTotals.receivable_cents);
    const receivedCents = this.toNumber(paymentTotals.received_cents);
    const homeworkTotal = this.toNumber(homeworkCounts.total_count);
    const publishedHomeworkCount = this.toNumber(homeworkCounts.published_count);

    return {
      activeStudentCount: contractScope.activeStudentCount,
      pendingHomeworkCount: this.toNumber(homeworkCounts.pending_count),
      reportPublishRate: homeworkTotal ? Number((publishedHomeworkCount / homeworkTotal).toFixed(4)) : 0,
      receivableCents,
      receivedCents,
      todayAttendanceAnomalyCount: this.toNumber(attendanceTotals.anomaly_count),
      trend: {
        receivableCents,
        receivedCents,
        renewalTodoCount: this.toNumber(renewalTotals.todo_count),
        communicationTouchCount: this.toNumber(communicationTotals.record_count),
        messageFailureCount: this.toNumber(messageTotals.failure_count),
      },
    };
  }

  async getTeachingAggregate(query: AnalyticsQueryDto): Promise<TeachingAggregate> {
    const contractScope = await this.getContractScope(query);
    const [teacherRows, teacherCommunicationRows, subjectAccuracyRows, topErrorRows, growthCoverageRows, countRows] = await Promise.all([
      this.selectRows<{
        teacher_id: string | null;
        pending_review_count: string | number | null;
        active_student_count: string | number | null;
      }>(sql`
        select
          h.teacher_id,
          count(*) filter (where h.review_status in ('unreviewed', 'reviewing')) as pending_review_count,
          count(distinct h.student_id) as active_student_count
        from homework_submissions h
        where ${this.joinConditions(this.homeworkScopeFilters(query, contractScope.studentIds))}
        group by h.teacher_id
      `),
      this.selectRows<{ teacher_id: string | null; communication_count: string | number | null }>(sql`
        select
          scoped.teacher_id,
          count(*) as communication_count
        from (
          select distinct h.teacher_id, h.student_id
          from homework_submissions h
          where ${this.joinConditions([
            ...this.homeworkScopeFilters(query, contractScope.studentIds),
            sql`h.teacher_id is not null`,
          ])}
        ) scoped
        join communication_records c on c.student_id = scoped.student_id
        where ${this.joinConditions(this.communicationScopeFilters(query, contractScope.studentIds, 'c'))}
        group by scoped.teacher_id
      `),
      this.selectRows<{ subject: string; avg_accuracy_pct: string | number | null; sample_count: string | number | null }>(sql`
        select
          h.subject,
          avg(h.final_accuracy_pct) as avg_accuracy_pct,
          count(*) as sample_count
        from homework_submissions h
        where ${this.joinConditions([
          ...this.homeworkScopeFilters(query, contractScope.studentIds),
          sql`h.final_accuracy_pct is not null`,
        ])}
        group by h.subject
        order by h.subject asc
      `),
      this.selectRows<{ label: string; count: string | number | null }>(sql`
        select token as label, count(*) as count
        from (
          select trim(regexp_split_to_table(coalesce(h.final_error_summary, ''), '[、,，\\s]+')) as token
          from homework_submissions h
          where ${this.joinConditions([
            ...this.homeworkScopeFilters(query, contractScope.studentIds),
            sql`coalesce(h.final_error_summary, '') <> ''`,
          ])}
        ) tokens
        where token <> ''
        group by token
        order by count desc, token asc
        limit 5
      `),
      this.selectRows<{ subject: string; total_minutes: string | number | null; session_count: string | number | null }>(sql`
        select
          d.subject,
          coalesce(sum(d.total_minutes), 0) as total_minutes,
          coalesce(sum(d.session_count), 0) as session_count
        from homework_time_daily_stats d
        where ${this.joinConditions(this.dailyStatScopeFilters(query, contractScope.studentIds))}
        group by d.subject
        order by d.subject asc
      `),
      this.selectOne<{
        homework_submission_count: string | number | null;
        communication_record_count: string | number | null;
        homework_daily_stat_count: string | number | null;
      }>(sql`
        select
          (${this.scalarSubquery(sql`
            select count(*)
            from homework_submissions h
            where ${this.joinConditions(this.homeworkScopeFilters(query, contractScope.studentIds))}
          `)}) as homework_submission_count,
          (${this.scalarSubquery(sql`
            select count(*)
            from communication_records c
            where ${this.joinConditions(this.communicationScopeFilters(query, contractScope.studentIds))}
          `)}) as communication_record_count,
          (${this.scalarSubquery(sql`
            select count(*)
            from homework_time_daily_stats d
            where ${this.joinConditions(this.dailyStatScopeFilters(query, contractScope.studentIds))}
          `)}) as homework_daily_stat_count
      `),
    ]);

    const communicationByTeacher = new Map(
      teacherCommunicationRows
        .filter((row) => row.teacher_id)
        .map((row) => [row.teacher_id!, this.toNumber(row.communication_count)]),
    );

    return {
      teacherWorkloads: teacherRows
        .filter((row) => row.teacher_id)
        .map((row) => ({
          teacherId: row.teacher_id!,
          teacherName: row.teacher_id!,
          pendingReviewCount: this.toNumber(row.pending_review_count),
          activeStudentCount: this.toNumber(row.active_student_count),
          communicationCount: communicationByTeacher.get(row.teacher_id!) ?? 0,
        })),
      subjectAccuracy: subjectAccuracyRows.map((row) => ({
        subject: row.subject,
        avgAccuracyPct: Number(this.toDecimal(row.avg_accuracy_pct).toFixed(2)),
        sampleCount: this.toNumber(row.sample_count),
      })),
      topErrors: topErrorRows.map((row) => ({ label: row.label, count: this.toNumber(row.count) })),
      growthCoverage: growthCoverageRows.map((row) => ({
        subject: row.subject,
        totalMinutes: this.toNumber(row.total_minutes),
        sessionCount: this.toNumber(row.session_count),
      })),
      dataSource: {
        homeworkSubmissionCount: this.toNumber(countRows.homework_submission_count),
        communicationRecordCount: this.toNumber(countRows.communication_record_count),
        homeworkDailyStatCount: this.toNumber(countRows.homework_daily_stat_count),
        mode: 'sql-aggregated',
      },
    };
  }

  async getBillingAggregate(query: AnalyticsQueryDto): Promise<BillingAggregate> {
    const contractScope = await this.getContractScope(query);
    const [receivableTrendRows, receivedTrendRows, renewalRows, communicationCount, messageTaskCount, invoiceRows, paymentRows, refundRows] = await Promise.all([
      this.selectRows<{ stat_date: string; amount_cents: string | number | null }>(sql`
        select
          i.issue_date::text as stat_date,
          coalesce(sum(i.amount_cents), 0) as amount_cents
        from invoices i
        ${this.joinScopedContracts('i.contract_id')}
        where ${this.joinConditions(this.invoiceScopeFilters(query, contractScope.contractIds))}
        group by i.issue_date
        order by i.issue_date asc
      `),
      this.selectRows<{ stat_date: string; amount_cents: string | number | null }>(sql`
        select
          to_char(p.payment_time at time zone 'utc', 'YYYY-MM-DD') as stat_date,
          coalesce(sum(p.paid_amount_cents), 0) as amount_cents
        from payments p
        join invoices i on i.id = p.invoice_id
        ${this.joinScopedContracts('i.contract_id')}
        where ${this.joinConditions([
          sql`p.status = 'success'`,
          ...this.invoiceScopeFilters(query, contractScope.contractIds),
          ...this.timestampRangeFilters('p.payment_time', query.dateFrom, query.dateTo),
        ])}
        group by to_char(p.payment_time at time zone 'utc', 'YYYY-MM-DD')
        order by stat_date asc
      `),
      this.selectRows<{ status: RenewalStatus; count: string | number | null }>(sql`
        select
          r.status,
          count(*) as count
        from renewals r
        ${this.joinScopedContracts('r.contract_id')}
        where ${this.joinConditions(this.renewalScopeFilters(query, contractScope.contractIds))}
        group by r.status
      `),
      this.selectOne<{ record_count: string | number | null }>(sql`
        select count(*) as record_count
        from communication_records c
        where ${this.joinConditions(this.communicationScopeFilters(query, contractScope.studentIds))}
      `),
      this.selectOne<{ task_count: string | number | null }>(sql`
        select count(*) as task_count
        from message_tasks m
        where ${this.joinConditions(this.messageTaskScopeFilters(query, contractScope.studentIds))}
      `),
      this.selectRows<{ id: string; amount_cents: string | number | null }>(sql`
        select i.id, i.amount_cents
        from invoices i
        ${this.joinScopedContracts('i.contract_id')}
        where ${this.joinConditions(this.invoiceScopeFilters(query, contractScope.contractIds))}
      `),
      this.selectRows<{ id: string; invoice_id: string; paid_amount_cents: string | number | null }>(sql`
        select p.id, p.invoice_id, p.paid_amount_cents
        from payments p
        join invoices i on i.id = p.invoice_id
        ${this.joinScopedContracts('i.contract_id')}
        where ${this.joinConditions([
          sql`p.status = 'success'`,
          ...this.invoiceScopeFilters(query, contractScope.contractIds),
          ...this.timestampRangeFilters('p.payment_time', query.dateFrom, query.dateTo),
        ])}
      `),
      this.selectRows<{ payment_id: string; refund_amount_cents: string | number | null }>(sql`
        select r.payment_id, r.refund_amount_cents
        from refunds r
        join payments p on p.id = r.payment_id
        join invoices i on i.id = p.invoice_id
        ${this.joinScopedContracts('i.contract_id')}
        where ${this.joinConditions([
          ...this.invoiceScopeFilters(query, contractScope.contractIds),
          ...this.timestampRangeFilters('p.payment_time', query.dateFrom, query.dateTo),
          ...this.timestampRangeFilters('r.refund_time', query.dateFrom, query.dateTo),
        ])}
      `),
    ]);

    const paidByInvoiceId = new Map<string, number>();
    for (const payment of paymentRows) {
      paidByInvoiceId.set(payment.invoice_id, (paidByInvoiceId.get(payment.invoice_id) ?? 0) + this.toNumber(payment.paid_amount_cents));
    }

    const invoiceIdByPaymentId = new Map(paymentRows.map((row) => [row.id, row.invoice_id]));
    for (const refund of refundRows) {
      const invoiceId = invoiceIdByPaymentId.get(refund.payment_id);
      if (!invoiceId) continue;
      paidByInvoiceId.set(invoiceId, (paidByInvoiceId.get(invoiceId) ?? 0) - this.toNumber(refund.refund_amount_cents));
    }

    const outstandingCents = invoiceRows.reduce((sum, row) => {
      const outstanding = this.toNumber(row.amount_cents) - (paidByInvoiceId.get(row.id) ?? 0);
      return sum + Math.max(outstanding, 0);
    }, 0);
    const invoiceCount = invoiceRows.filter((row) => (paidByInvoiceId.get(row.id) ?? 0) < this.toNumber(row.amount_cents)).length;

    const renewalCounts = new Map(renewalRows.map((row) => [row.status, this.toNumber(row.count)]));
    const statuses: RenewalStatus[] = ['todo', 'contacting', 'won', 'lost', 'closed'];

    return {
      receivableTrend: receivableTrendRows.map((row) => ({ date: row.stat_date, amountCents: this.toNumber(row.amount_cents) })),
      receivedTrend: receivedTrendRows.map((row) => ({ date: row.stat_date, amountCents: this.toNumber(row.amount_cents) })),
      agingSummary: [{ bucket: 'current', invoiceCount, outstandingCents }],
      renewalFunnel: statuses.map((status) => ({ status, count: renewalCounts.get(status) ?? 0 })),
      contractCount: contractScope.contractIds.length,
      communicationTouchCount: this.toNumber(communicationCount.record_count),
      messageTaskCount: this.toNumber(messageTaskCount.task_count),
    };
  }

  private async getContractScope(query: AnalyticsQueryDto) {
    const rows = await this.selectRows<{ id: string; student_id: string; status: string }>(sql`
      select c.id, c.student_id, c.status
      from contracts c
      where ${this.joinConditions(this.contractScopeFilters(query))}
    `);

    return {
      contractIds: rows.map((row) => row.id),
      studentIds: [...new Set(rows.map((row) => row.student_id))],
      activeStudentCount: new Set(rows.filter((row) => row.status === 'active').map((row) => row.student_id)).size,
    };
  }

  private contractScopeFilters(query: AnalyticsQueryDto, alias = 'c') {
    return [
      ...this.eqFilter(`${alias}.campus_id`, query.campusId),
      ...this.eqFilter(`${alias}.term_id`, query.termId),
      ...this.dateRangeFilters(`${alias}.start_date`, query.dateFrom, query.dateTo),
    ];
  }

  private invoiceScopeFilters(query: AnalyticsQueryDto, contractIds: string[], invoiceAlias = 'i') {
    const filters = [...this.dateRangeFilters(`${invoiceAlias}.issue_date`, query.dateFrom, query.dateTo)];
    if (query.campusId || query.termId) {
      filters.push(...this.inFilter(`${invoiceAlias}.contract_id`, contractIds, false));
    }
    return filters;
  }

  private renewalScopeFilters(query: AnalyticsQueryDto, contractIds: string[], renewalAlias = 'r') {
    const filters = [
      ...this.coalescedDateRangeFilters(
        `coalesce(${renewalAlias}.expected_end_date::text, to_char(${renewalAlias}.next_follow_up_at at time zone 'utc', 'YYYY-MM-DD'))`,
        query.dateFrom,
        query.dateTo,
      ),
    ];
    if (query.campusId || query.termId) {
      filters.push(...this.inFilter(`${renewalAlias}.contract_id`, contractIds, false));
    }
    return filters;
  }

  private homeworkScopeFilters(query: AnalyticsQueryDto, studentIds: string[], alias = 'h') {
    return [
      ...this.inFilter(`${alias}.student_id`, studentIds, true),
      ...this.eqFilter(`${alias}.teacher_id`, query.teacherId),
      ...this.dateRangeFilters(`${alias}.homework_date`, query.dateFrom, query.dateTo),
    ];
  }

  private attendanceScopeFilters(query: AnalyticsQueryDto, studentIds: string[], alias = 'a') {
    return [
      ...this.eqFilter(`${alias}.campus_id`, query.campusId),
      ...this.inFilter(`${alias}.student_id`, studentIds, true),
      ...this.timestampRangeFilters(`${alias}.event_time`, query.dateFrom, query.dateTo),
    ];
  }

  private dailyStatScopeFilters(query: AnalyticsQueryDto, studentIds: string[], alias = 'd') {
    return [
      ...this.inFilter(`${alias}.student_id`, studentIds, true),
      ...this.dateRangeFilters(`${alias}.stat_date`, query.dateFrom, query.dateTo),
    ];
  }

  private communicationScopeFilters(query: AnalyticsQueryDto, studentIds: string[], alias = 'c') {
    return [
      ...this.optionalInFilter(`${alias}.student_id`, studentIds),
      ...this.timestampRangeFilters(`${alias}.created_at`, query.dateFrom, query.dateTo),
    ];
  }

  private messageTaskScopeFilters(query: AnalyticsQueryDto, studentIds: string[], alias = 'm') {
    const scheduledDate = `coalesce(to_char(${alias}.sent_at at time zone 'utc', 'YYYY-MM-DD'), to_char(${alias}.scheduled_at at time zone 'utc', 'YYYY-MM-DD'), to_char(${alias}.created_at at time zone 'utc', 'YYYY-MM-DD'))`;
    return [
      ...this.optionalInFilter(`${alias}.student_id`, studentIds),
      ...this.coalescedDateRangeFilters(scheduledDate, query.dateFrom, query.dateTo),
    ];
  }

  private joinScopedContracts(contractIdRef: string) {
    return sql`left join contracts scoped_contracts on scoped_contracts.id = ${sql.raw(contractIdRef)}`;
  }

  private eqFilter(column: string, value?: string) {
    return value == null ? [] : [sql`${sql.raw(column)} = ${value}`];
  }

  private inFilter(column: string, values: string[], skipWhenEmpty: boolean) {
    if (!values.length) {
      return skipWhenEmpty ? [] : [sql`1 = 0`];
    }
    return [sql`${sql.raw(column)} in (${sql.join(values.map((value) => sql`${value}`), sql`, `)})`];
  }

  private optionalInFilter(column: string, values: string[]) {
    if (!values.length) return [];
    return [sql`(${sql.raw(column)} is null or ${sql.raw(column)} in (${sql.join(values.map((value) => sql`${value}`), sql`, `)}))`];
  }

  private dateRangeFilters(column: string, dateFrom?: string, dateTo?: string) {
    const filters: SQL[] = [];
    if (dateFrom) filters.push(sql`${sql.raw(column)} >= ${dateFrom}`);
    if (dateTo) filters.push(sql`${sql.raw(column)} <= ${dateTo}`);
    return filters;
  }

  private coalescedDateRangeFilters(expression: string, dateFrom?: string, dateTo?: string) {
    const filters: SQL[] = [];
    if (dateFrom) filters.push(sql`${sql.raw(expression)} >= ${dateFrom}`);
    if (dateTo) filters.push(sql`${sql.raw(expression)} <= ${dateTo}`);
    return filters;
  }

  private timestampRangeFilters(column: string, dateFrom?: string, dateTo?: string) {
    const filters: SQL[] = [];
    if (dateFrom) filters.push(sql`${sql.raw(`to_char(${column} at time zone 'utc', 'YYYY-MM-DD')`)} >= ${dateFrom}`);
    if (dateTo) filters.push(sql`${sql.raw(`to_char(${column} at time zone 'utc', 'YYYY-MM-DD')`)} <= ${dateTo}`);
    return filters;
  }

  private joinConditions(conditions: SQL[]) {
    return conditions.length ? sql.join(conditions, sql` and `) : sql`1 = 1`;
  }

  private scalarSubquery(query: SQL) {
    return sql`${query}`;
  }

  private async selectRows<T extends Record<string, unknown>>(query: SQL): Promise<T[]> {
    if (!this.db) {
      throw new Error('DB aggregation requested without DATABASE_URL');
    }
    const result = await this.db.execute(query);
    if (Array.isArray(result)) {
      return result as T[];
    }
    return ((result as { rows?: T[] }).rows ?? []) as T[];
  }

  private async selectOne<T extends Record<string, unknown>>(query: SQL): Promise<T> {
    const rows = await this.selectRows<T>(query);
    return (rows[0] ?? {}) as T;
  }

  private toNumber(value: string | number | null | undefined) {
    if (value == null) return 0;
    return typeof value === 'number' ? value : Number(value);
  }

  private toDecimal(value: string | number | null | undefined) {
    if (value == null) return 0;
    return typeof value === 'number' ? value : Number(value);
  }
}
