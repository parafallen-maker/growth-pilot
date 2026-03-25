import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BadRequestException, ConflictException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AnalyticsController } from '../../src/modules/analytics/controller/analytics.controller';
import { AttendanceController } from '../../src/modules/attendance/controller/attendance.controller';
import { AuthController } from '../../src/modules/auth/controller/auth.controller';
import { BillingController } from '../../src/modules/billing/controller/billing.controller';
import { CommunicationController } from '../../src/modules/communication/controller/communication.controller';
import { FamiliesController } from '../../src/modules/families/families.controller';
import { FilesController } from '../../src/modules/files/controller/files.controller';
import { GrowthController } from '../../src/modules/growth/controller/growth.controller';
import { HomeworkController } from '../../src/modules/homework/controller/homework.controller';
import { JobsController } from '../../src/modules/jobs/controller/jobs.controller';
import { JobsRepository } from '../../src/modules/jobs/repository/jobs.repository';
import { JobsService } from '../../src/modules/jobs/service/jobs.service';
import { SettingsController } from '../../src/modules/settings/controller/settings.controller';
import { SettingsRepository } from '../../src/modules/settings/repository/settings.repository';
import { SettingsService } from '../../src/modules/settings/service/settings.service';
import { StudentsController } from '../../src/modules/students/students.controller';
import { TeachersController } from '../../src/modules/teachers/teachers.controller';
import { UsersController } from '../../src/modules/users/controller/users.controller';
import { UsersRepository } from '../../src/modules/users/repository/users.repository';
import { UsersService } from '../../src/modules/users/service/users.service';
import { PERMISSION_METADATA_KEY } from '../../src/common/permission.decorator';
import { createQaFixture } from './e2e-main-flow.fixture';

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const openApiText = readFileSync(resolve(currentDir, '../../../../docs/growthpilot/07_OpenAPI.yaml'), 'utf8');

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertOpenApiOperation(path: string, method: string) {
  const pathPattern = new RegExp(`^  ${escapeRegExp(path)}:\\s*$`, 'm');
  const pathMatch = pathPattern.exec(openApiText);
  assert.ok(pathMatch, `${method.toUpperCase()} ${path} must exist in OpenAPI`);
  const blockStart = pathMatch.index + pathMatch[0].length;
  const remainder = openApiText.slice(blockStart);
  const nextPathMatch = /\n  \/[^:\n]+:\s*$/m.exec(remainder);
  const block = nextPathMatch ? remainder.slice(0, nextPathMatch.index) : remainder;
  assert.match(block, new RegExp(`\\n    ${method.toLowerCase()}:`), `${method.toUpperCase()} ${path} must exist in OpenAPI`);
}

function assertEnvelope<T>(payload: { code: string; message: string; data: T; traceId: string }) {
  assert.equal(payload.code, 'OK');
  assert.equal(payload.message, 'success');
  assert.ok(payload.traceId);
  return payload.data;
}

const controllerClasses = [
  AnalyticsController,
  AttendanceController,
  AuthController,
  BillingController,
  CommunicationController,
  FamiliesController,
  FilesController,
  GrowthController,
  HomeworkController,
  JobsController,
  SettingsController,
  StudentsController,
  TeachersController,
  UsersController,
];

const requestMethodNames: Partial<Record<RequestMethod, string>> = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.PATCH]: 'patch',
  [RequestMethod.DELETE]: 'delete',
};

function normalizeRoutePart(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function collectControllerOperations() {
  const operations = [];

  for (const controllerClass of controllerClasses) {
    const controllerPath = normalizeRoutePart(Reflect.getMetadata(PATH_METADATA, controllerClass));
    const prototype = controllerClass.prototype;

    for (const propertyName of Object.getOwnPropertyNames(prototype)) {
      if (propertyName === 'constructor') {
        continue;
      }

      const handler = prototype[propertyName];
      const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler);
      if (requestMethod === undefined) {
        continue;
      }

      const methodPath = normalizeRoutePart(Reflect.getMetadata(PATH_METADATA, handler));
      const path = `/${[controllerPath, methodPath].filter(Boolean).join('/')}`.replace(/\/+/g, '/');

      operations.push({
        path,
        method: requestMethodNames[requestMethod] ?? `unknown:${String(requestMethod)}`,
        permission: Reflect.getMetadata(PERMISSION_METADATA_KEY, handler) ?? null,
        controller: controllerClass.name,
        handler: propertyName,
      });
    }
  }

  return operations.sort((left, right) =>
    `${left.method} ${left.path}`.localeCompare(`${right.method} ${right.path}`),
  );
}

test('QA-06 OpenAPI covers every implemented controller route in the merged API surface', () => {
  const implementedOperations = collectControllerOperations();

  assert.ok(implementedOperations.length >= 89, `expected at least 89 implemented operations, got ${implementedOperations.length}`);

  for (const operation of implementedOperations) {
    assertOpenApiOperation(operation.path, operation.method);
  }
});

test('QA-06 contract smoke exercises representative happy paths across auth, core data, billing, attendance, files, communication, analytics, and jobs', async () => {
  const fixture = createQaFixture();

  const authController = new AuthController(fixture.authService);
  const settingsController = new SettingsController(new SettingsService(new SettingsRepository()));
  const usersController = new UsersController(new UsersService(new UsersRepository()));
  const jobsRepository = new JobsRepository();
  const jobsService = new JobsService(jobsRepository);
  const jobsController = new JobsController(jobsService);
  const teachersController = new TeachersController(fixture.teachersService);
  const studentsController = new StudentsController(fixture.studentsService);
  const familiesController = new FamiliesController(fixture.familiesService);
  const filesController = new FilesController(fixture.filesService);
  const homeworkController = new HomeworkController(fixture.homeworkService);
  const growthController = new GrowthController(fixture.growthService);
  const attendanceController = new AttendanceController(fixture.attendanceService);
  const billingController = new BillingController(fixture.billingService);
  const communicationController = new CommunicationController(fixture.communicationService);
  const analyticsController = new AnalyticsController(fixture.analyticsService);

  const login = assertEnvelope(await authController.login({ username: 'admin', password: 'admin123' }));
  assert.equal(login.user.username, 'admin');
  assert.ok(login.accessToken);
  assert.ok(login.refreshToken);

  const me = assertEnvelope(await authController.currentUser(`Bearer ${login.accessToken}`));
  assert.ok(me.permissions.includes('billing:contracts:view'));

  const campuses = assertEnvelope(await settingsController.listCampuses());
  assert.ok(campuses.list.length >= 1);
  const terms = assertEnvelope(await settingsController.listTerms());
  assert.ok(terms.list.length >= 1);
  const dictionaries = assertEnvelope(await settingsController.listDictionaries());
  assert.ok(dictionaries.list.length >= 1);

  const users = assertEnvelope(await usersController.listUsers(undefined, '1', '20'));
  assert.ok(users.list.length >= 2);
  const createdUser = assertEnvelope(await usersController.createUser({
    username: 'qa.user',
    password: 'qa123456',
    displayName: 'QA User',
    roleIds: ['teacher'],
    campusIds: ['campus-001'],
  }));
  assert.equal(createdUser.username, 'qa.user');
  assert.deepEqual(assertEnvelope(await usersController.assignRoles('user-teacher-001', { roleIds: ['teacher'] })), { success: true });

  const queuedJob = jobsService.createJob({
    jobType: 'qa-smoke',
    bizType: 'contract',
    bizId: `qa-openapi-${Date.now()}`,
    payload: { source: 'qa' },
  });
  const jobs = assertEnvelope(await jobsController.listJobs('queued', 'qa-smoke', 'contract'));
  assert.ok(jobs.list.some((item) => item.jobId === queuedJob.jobId));
  assert.equal(assertEnvelope(await jobsController.getJob(queuedJob.jobId)).jobId, queuedJob.jobId);

  const teachers = assertEnvelope(await teachersController.list({ pageNo: 1, pageSize: 20 }));
  const teacherId = teachers.list[0]?.id;
  assert.ok(teacherId);
  assert.equal(assertEnvelope(await teachersController.detail(teacherId!)).teacher.id, teacherId);
  const developmentRecord = assertEnvelope(await teachersController.createDevelopmentRecord(teacherId!, {
    recordType: 'coaching',
    title: 'QA 教研记录',
  }, { id: 'user-admin-001' }));
  assert.equal(developmentRecord.teacherId, teacherId);

  const students = assertEnvelope(await studentsController.list({ pageNo: 1, pageSize: 20 }));
  const studentId = students.list[0]?.id;
  assert.ok(studentId);
  const importJob = assertEnvelope(await studentsController.import({
    fileName: 'qa-students.csv',
    content: 'studentNo,name,gradeLabel\nS910,合同测试学生,一年级',
  }));
  assert.equal(importJob.status, 'success');
  assert.equal(assertEnvelope(await studentsController.detail(studentId!)).id, studentId);
  assert.equal(assertEnvelope(await studentsController.detail360(studentId!)).student.id, studentId);

  const families = assertEnvelope(await familiesController.list({ pageNo: 1, pageSize: 20 }));
  const familyId = families.list[0]?.id;
  assert.ok(familyId);
  const task = assertEnvelope(await familiesController.createTask(familyId!, {
    title: '同步家庭任务',
    studentId: studentId!,
    assigneeGuardianId: 'guardian-001',
  }, { id: 'user-admin-001' }));
  assert.equal(task.familyId, familyId);
  assert.equal(assertEnvelope(await familiesController.detail(familyId!)).family.id, familyId);

  const uploaded = assertEnvelope(await filesController.uploadOne({
    fileName: 'qa-contract-smoke.txt',
    mimeType: 'text/plain',
    sizeBytes: 5,
    checksum: 'sha256:qa-smoke',
    contentBase64: Buffer.from('hello').toString('base64'),
    uploadedBy: 'user-admin-001',
    purpose: 'qa',
  }));
  const fileDetail = await assertEnvelope(await filesController.getFileAsset(uploaded.fileId));
  assert.equal(fileDetail.fileId, uploaded.fileId);
  const batchUpload = assertEnvelope(await filesController.uploadMany({
    files: [{
      fileName: 'qa-batch.txt',
      mimeType: 'text/plain',
      sizeBytes: 4,
      checksum: 'sha256:batch',
      contentBase64: Buffer.from('data').toString('base64'),
      uploadedBy: 'user-admin-001',
      purpose: 'qa',
    }],
  }));
  assert.equal(batchUpload.files.length, 1);

  const submissions = assertEnvelope(await homeworkController.listSubmissions({ pageNo: 1, pageSize: 20 }));
  const submissionId = submissions.list[0]?.id;
  assert.ok(submissionId);
  const submissionDetail = assertEnvelope(await homeworkController.getSubmissionDetail(submissionId!));
  assert.equal(submissionDetail.submission.id, submissionId);
  assert.ok(Array.isArray(assertEnvelope(await homeworkController.listOutboxEvents())));
  assert.ok(Array.isArray(assertEnvelope(await homeworkController.listErrorTaxonomies({ status: 'active' }))));
  assert.equal((assertEnvelope(await homeworkController.getReviewDraft(submissionId!))?.reviewerTeacherId) ?? null, null);

  const rubrics = assertEnvelope(await growthController.listRubrics({ pageNo: 1, pageSize: 20 }));
  const rubricId = rubrics.list[0]?.id;
  assert.ok(rubricId);
  assert.equal(assertEnvelope(await growthController.getRubric(rubricId!)).id, rubricId);
  const reportJob = assertEnvelope(await growthController.generateReport({
    reportType: 'weekly',
    periodKey: '2026-W13',
    studentIds: ['student-001'],
    termId: 'term-2026-spring',
  }));
  assert.equal(reportJob.status, 'queued');
  let reports = assertEnvelope(await growthController.listReports({ pageNo: 1, pageSize: 20 }));
  for (let attempt = 0; attempt < 5 && reports.list.length === 0; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    reports = assertEnvelope(await growthController.listReports({ pageNo: 1, pageSize: 20 }));
  }
  const reportId = reports.list[0]?.id;
  assert.ok(reportId);
  assert.equal(assertEnvelope(await growthController.getReport(reportId!)).report.id, reportId);

  const createdDevice = assertEnvelope(await attendanceController.createDevice({
    serialNo: 'BEACON-QA-002',
    campusId: 'campus-001',
    deviceType: 'beacon',
    status: 'idle',
    note: 'QA smoke device',
  }));
  const createdBinding = assertEnvelope(await attendanceController.createBinding({
    studentId: 'student-qa-001',
    deviceId: createdDevice.id,
    status: 'active',
    boundAt: '2026-03-25T09:00:00+08:00',
    createdBy: 'user-admin-001',
  }));
  const updatedBinding = assertEnvelope(await attendanceController.updateBinding(createdBinding.id, {
    status: 'inactive',
    unboundAt: '2026-03-25T10:00:00+08:00',
  }));
  assert.equal(updatedBinding.status, 'inactive');
  const createdEvent = assertEnvelope(await attendanceController.createEvent({
    studentId: 'student-qa-001',
    campusId: 'campus-001',
    deviceId: createdDevice.id,
    eventType: 'checkin',
    eventTime: '2026-03-25T09:05:00+08:00',
    operatorUserId: 'user-admin-001',
  }, 'qa-attendance-event'));
  assert.equal(createdEvent.studentId, 'student-qa-001');
  assert.ok(assertEnvelope(await attendanceController.listDevices({ pageNo: 1, pageSize: 20 })).list.length >= 2);
  assert.ok(assertEnvelope(await attendanceController.listBindings({ pageNo: 1, pageSize: 20 })).list.length >= 2);
  assert.ok(assertEnvelope(await attendanceController.listEvents({ pageNo: 1, pageSize: 20 })).list.length >= 2);
  assert.ok(assertEnvelope(await attendanceController.getHomeworkTimeDailyStats({ pageNo: 1, pageSize: 20 })).list.length >= 1);

  const createdProduct = assertEnvelope(await billingController.createProduct({
    code: 'QA-PROD-001',
    name: 'QA billing product',
    category: 'care',
    billingMode: 'term',
    priceCents: 8800,
    unit: 'term',
    status: 'active',
  }));
  assert.equal(createdProduct.code, 'QA-PROD-001');
  const contracts = assertEnvelope(await billingController.listContracts({ pageNo: 1, pageSize: 20 }));
  const contractId = contracts.list[0]?.id;
  assert.ok(contractId);
  assert.equal(assertEnvelope(await billingController.getContract(contractId!)).contract.id, contractId);
  const invoices = assertEnvelope(await billingController.listInvoices({ pageNo: 1, pageSize: 20 }));
  const invoiceId = invoices.list[0]?.id;
  assert.ok(invoiceId);
  const payment = assertEnvelope(await billingController.createPayment(invoiceId!, {
    paymentNo: 'PAY-QA-001',
    paidAmountCents: 120000,
    paymentTime: '2026-03-25T11:00:00+08:00',
    channel: 'wechat_pay',
    status: 'success',
  }, 'qa-payment-001'));
  assert.equal(payment.status, 'success');
  const paymentDetail = assertEnvelope(await billingController.getPayment(payment.paymentId));
  assert.equal(paymentDetail.payment.id, payment.paymentId);
  const refund = assertEnvelope(await billingController.createRefund(payment.paymentId, {
    refundNo: 'REF-QA-001',
    refundAmountCents: 20000,
    refundTime: '2026-03-25T11:30:00+08:00',
    reason: 'qa adjustment',
    status: 'success',
  }));
  assert.equal(assertEnvelope(await billingController.getRefund(refund.refundId)).refund.id, refund.refundId);
  const createdRenewal = assertEnvelope(await billingController.createRenewal({
    familyId: 'family-001',
    studentId: 'student-001',
    contractId: contractId!,
    campusId: 'campus-001',
    termId: 'term-2026-spring',
    ownerUserId: 'user-admin-001',
    expectedEndDate: '2026-07-15',
    nextFollowUpAt: '2026-06-20T10:00:00+08:00',
    status: 'todo',
    note: 'qa follow-up',
  }));
  assert.equal(assertEnvelope(await billingController.updateRenewalStatus(createdRenewal.id, {
    status: 'contacting',
    lastContactAt: '2026-03-25T12:00:00+08:00',
    note: 'contacted',
  })).status, 'contacting');
  assert.equal(assertEnvelope(await billingController.updateRenewalFollowUp(createdRenewal.id, {
    nextFollowUpAt: '2026-03-28T10:00:00+08:00',
    note: 'rescheduled',
  })).nextFollowUpAt, '2026-03-28T10:00:00+08:00');

  const records = assertEnvelope(await communicationController.listRecords({ pageNo: 1, pageSize: 20 }));
  const recordId = records.list[0]?.id;
  assert.ok(recordId);
  assert.equal(assertEnvelope(await communicationController.getRecord(recordId!)).id, recordId);
  const createdRecord = assertEnvelope(await communicationController.createRecord({
    familyId: 'family-001',
    studentId: 'student-001',
    channel: 'wechat',
    direction: 'outbound',
    topic: 'QA outreach',
    summary: 'Reached family for smoke test.',
    nextAction: 'none',
  }));
  assert.equal(createdRecord.topic, 'QA outreach');
  const createdTemplate = assertEnvelope(await communicationController.createTemplate({
    code: 'qa-template-001',
    name: 'QA Template',
    channel: 'wechat',
    subject: 'QA',
    bodyTemplate: 'Hello {{studentName}}',
    variables: ['studentName'],
    status: 'active',
  }));
  assert.equal(assertEnvelope(await communicationController.updateTemplate(createdTemplate.id, {
    subject: 'QA updated',
  })).subject, 'QA updated');
  const createdTask = assertEnvelope(await communicationController.createMessageTask({
    templateId: createdTemplate.id,
    familyId: 'family-001',
    studentId: 'student-001',
    channel: 'wechat',
    subject: 'QA task',
    body: 'Smoke body',
    status: 'draft',
  }));
  assert.equal(assertEnvelope(await communicationController.updateMessageTaskStatus(createdTask.id, {
    status: 'sent',
    sentAt: '2026-03-25T13:00:00+08:00',
  })).status, 'sent');
  assert.ok(assertEnvelope(await communicationController.listTemplates({ pageNo: 1, pageSize: 20 })).list.length >= 2);
  assert.ok(assertEnvelope(await communicationController.listMessageTasks({ pageNo: 1, pageSize: 20 })).list.length >= 3);

  const overview = assertEnvelope(await analyticsController.getOverview({ campusId: 'campus-001' }));
  assert.equal(typeof overview.receivableCents, 'number');
  const teaching = assertEnvelope(await analyticsController.getTeaching({}));
  assert.ok(Array.isArray(teaching.teacherWorkloads));
  const billing = assertEnvelope(await analyticsController.getBilling({}));
  assert.ok(Array.isArray(billing.receivableTrend));

  const refreshed = assertEnvelope(await authController.refresh({ refreshToken: login.refreshToken }));
  assert.ok(refreshed.accessToken);
  assert.deepEqual(assertEnvelope(await authController.logout(`Bearer ${refreshed.accessToken}`, { refreshToken: refreshed.refreshToken })), {});
});

test('QA-06 contract smoke captures representative error semantics for auth, attendance, billing, communication, and files', async () => {
  const fixture = createQaFixture();
  const authController = new AuthController(fixture.authService);
  const attendanceController = new AttendanceController(fixture.attendanceService);
  const billingController = new BillingController(fixture.billingService);
  const communicationController = new CommunicationController(fixture.communicationService);
  const filesController = new FilesController(fixture.filesService);

  await assert.rejects(
    () => authController.currentUser(undefined),
    (error: unknown) => error instanceof BadRequestException && /authorization header is required/i.test(error.message),
  );

  const createdDevice = assertEnvelope(await attendanceController.createDevice({
    serialNo: 'BEACON-QA-003',
    campusId: 'campus-001',
    deviceType: 'beacon',
    status: 'idle',
  }));
  await attendanceController.createBinding({
    studentId: 'student-qa-001',
    deviceId: createdDevice.id,
    status: 'active',
    boundAt: '2026-03-25T14:00:00+08:00',
  });
  await assert.rejects(
    () => attendanceController.createBinding({
      studentId: 'student-qa-002',
      deviceId: createdDevice.id,
      status: 'active',
      boundAt: '2026-03-25T14:10:00+08:00',
    }),
    (error: unknown) => error instanceof ConflictException && /device already has an active binding/i.test(error.message),
  );

  const invoices = assertEnvelope(await billingController.listInvoices({ pageNo: 1, pageSize: 20 }));
  const invoiceId = invoices.list[0]?.id;
  assert.ok(invoiceId);
  await assert.rejects(
    () => billingController.createPayment(invoiceId!, {
      paymentNo: 'PAY-QA-OVER',
      paidAmountCents: 99999999,
      paymentTime: '2026-03-25T15:00:00+08:00',
      channel: 'wechat_pay',
      status: 'success',
    }),
    (error: unknown) => error instanceof ConflictException && /payment exceeds invoice receivable/i.test(error.message),
  );

  await assert.rejects(
    () => communicationController.createTemplate({
      code: 'weekly-report',
      name: 'duplicate',
      channel: 'wechat',
      subject: 'dup',
      bodyTemplate: 'dup',
      variables: [],
      status: 'active',
    }),
    (error: unknown) => error instanceof ConflictException && /template code already exists/i.test(error.message),
  );

  await assert.rejects(
    () => filesController.uploadMany({ files: [] }),
    (error: unknown) => error instanceof BadRequestException && /files is required/i.test(error.message),
  );
});
