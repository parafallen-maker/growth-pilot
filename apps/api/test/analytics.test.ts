import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AnalyticsRepository } from '../src/modules/analytics/repository/analytics.repository';
import { AnalyticsService } from '../src/modules/analytics/service/analytics.service';
import { AttendanceRepository } from '../src/modules/attendance/repository/attendance.repository';
import { BillingRepository } from '../src/modules/billing/repository/billing.repository';
import { BillingService } from '../src/modules/billing/service/billing.service';
import { CommunicationRepository } from '../src/modules/communication/repository/communication.repository';
import { HomeworkRepository } from '../src/modules/homework/repository/homework.repository';

function createFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'growthpilot-analytics-'));
  const billingRepository = new BillingRepository(join(dir, 'billing.json'));
  const communicationRepository = new CommunicationRepository(join(dir, 'communication.json'));
  const attendanceRepository = new AttendanceRepository(join(dir, 'attendance.json'));
  const homeworkRepository = new HomeworkRepository(join(dir, 'homework.json'));
  const billingService = new BillingService(billingRepository);
  const analyticsService = new AnalyticsService(new AnalyticsRepository(billingRepository, communicationRepository, attendanceRepository, homeworkRepository));
  return { billingService, analyticsService };
}

test('renewals skeleton supports list/create/status/follow-up with scoped filters', () => {
  const { billingService } = createFixture();

  const before = billingService.listRenewals({ campusId: 'campus-001', termId: 'term-2026-spring', pageNo: 1, pageSize: 20 });
  assert.equal(before.page.total, 1);

  const created = billingService.createRenewal({
    familyId: 'family-002',
    studentId: 'student-002',
    campusId: 'campus-001',
    termId: 'term-2026-spring',
    ownerUserId: 'user-finance-001',
    expectedEndDate: '2026-06-28',
    nextFollowUpAt: '2026-06-12T09:00:00+08:00',
    note: '二次跟进',
  });
  assert.equal(created.status, 'todo');

  const updatedStatus = billingService.updateRenewalStatus(created.id, { status: 'contacting', lastContactAt: '2026-06-11T18:00:00+08:00' });
  assert.equal(updatedStatus.status, 'contacting');

  const updatedFollowUp = billingService.updateRenewalFollowUp(created.id, { nextFollowUpAt: '2026-06-13T10:30:00+08:00' });
  assert.equal(updatedFollowUp.nextFollowUpAt, '2026-06-13T10:30:00+08:00');

  const filtered = billingService.listRenewals({
    campusId: 'campus-001',
    termId: 'term-2026-spring',
    status: 'contacting',
    dateFrom: '2026-06-01',
    dateTo: '2026-06-30',
    pageNo: 1,
    pageSize: 20,
  });
  assert.equal(filtered.page.total, 1);
  assert.equal(filtered.list[0]?.id, created.id);
});

test('analytics aggregates billing + homework + communication + attendance from repositories', async () => {
  const { billingService, analyticsService } = createFixture();

  const invoice = billingService.createInvoice({
    invoiceNo: 'IV202603250001',
    contractId: 'contract-001',
    familyId: 'family-001',
    studentId: 'student-001',
    issueDate: '2026-03-25',
    dueDate: '2026-03-30',
    amountCents: 50000,
    status: 'issued',
  });
  billingService.createPayment(invoice.id, {
    paymentNo: 'PM202603250001',
    paidAmountCents: 30000,
    paymentTime: '2026-03-25T09:00:00+08:00',
    channel: 'wechat',
  });

  const scope = { campusId: 'campus-001', termId: 'term-2026-spring', dateFrom: '2026-03-01', dateTo: '2026-03-31' };

  const overview = await analyticsService.getOverview(scope);
  assert.equal(overview.receivableCents, 410000);
  assert.equal(overview.receivedCents, 30000);
  assert.equal(overview.pendingHomeworkCount, 0);
  assert.equal(overview.reportPublishRate, 1);
  assert.equal(overview.todayAttendanceAnomalyCount, 1);
  assert.equal(overview.trend.renewalTodoCount, 1);
  assert.ok(overview.trend.communicationTouchCount >= 1);

  const billing = await analyticsService.getBilling(scope);
  assert.equal(billing.contractCount, 1);
  assert.equal(billing.filtersApplied.campusId, 'campus-001');
  assert.ok(billing.receivableTrend.some((item) => item.date === '2026-03-25' && item.amountCents === 50000));
  assert.ok(billing.renewalFunnel.some((item) => item.status === 'todo'));
  assert.ok(billing.communicationTouchCount >= 1);

  const teaching = await analyticsService.getTeaching({ ...scope, teacherId: 'teacher-001' });
  assert.equal(teaching.filtersApplied.termId, 'term-2026-spring');
  assert.equal(teaching.teacherWorkloads[0]?.teacherId, 'teacher-001');
  assert.ok(teaching.subjectAccuracy.some((item) => item.subject === 'math'));
  assert.equal(teaching.dataSource.mode, 'repository-aggregated');
});
