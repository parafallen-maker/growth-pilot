import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { dynamicRouteValues } from './web-surface.mjs';

const require = createRequire(import.meta.url);

globalThis.AsyncLocalStorage ??= (await import('node:async_hooks')).AsyncLocalStorage;

const { workUnitAsyncStorage } = await import('next/dist/server/app-render/work-unit-async-storage.external.js');
const { RequestCookies } = await import('next/dist/server/web/spec-extension/cookies.js');
const { RequestCookiesAdapter } = await import('next/dist/server/web/spec-extension/adapters/request-cookies.js');

const PERSONAS = {
  admin: {
    id: 'user-admin',
    username: 'admin',
    displayName: '系统管理员',
    roles: ['super_admin'],
    campusIds: ['campus-guiyang'],
    permissions: [
      'dashboard:view',
      'teachers:view',
      'students:view',
      'families:view',
      'homework:view',
      'homework:review',
      'homework:error-taxonomies:view',
      'growth:rubrics:view',
      'growth:observations:view',
      'growth:goals:view',
      'growth:reports:view',
      'attendance:board:view',
      'attendance:devices:view',
      'attendance:homework-time:view',
      'billing:products:view',
      'billing:contracts:view',
      'billing:invoices:view',
      'billing:renewals:view',
      'communication:records:view',
      'communication:messages:view',
      'analytics:overview:view',
      'analytics:teaching:view',
      'analytics:billing:view',
      'users:view',
      'settings:view',
      'jobs:read',
    ],
  },
  'teacher.zhang': {
    id: 'user-teacher-zhang',
    username: 'teacher.zhang',
    displayName: '张老师',
    roles: ['subject_teacher'],
    campusIds: ['campus-guiyang'],
    permissions: [
      'students:view',
      'homework:view',
      'homework:review',
      'growth:observations:view',
      'growth:goals:view',
      'attendance:homework-time:view',
    ],
  },
};

const FIXTURES = {
  users: [
    { id: 'user-admin', username: 'admin', displayName: '系统管理员', roles: ['super_admin'], campusIds: ['campus-guiyang'], status: 'active', permissions: PERSONAS.admin.permissions },
    { id: 'user-teacher-zhang', username: 'teacher.zhang', displayName: '张老师', roles: ['subject_teacher'], campusIds: ['campus-guiyang'], status: 'active', permissions: PERSONAS['teacher.zhang'].permissions },
    { id: 'user-finance-chen', username: 'finance.chen', displayName: '陈财务', roles: ['finance'], campusIds: ['campus-guiyang'], status: 'active', permissions: ['billing:products:view', 'billing:contracts:view', 'billing:invoices:view', 'billing:renewals:view', 'analytics:billing:view'] },
  ],
  campuses: [
    { id: 'campus-guiyang', code: 'GY', name: '贵阳主校区', status: 'active' },
  ],
  terms: [
    { id: '2026-spring', campusId: 'campus-guiyang', code: '2026-SPR', name: '2026 春季', startDate: '2026-02-18', endDate: '2026-07-01', status: 'active' },
  ],
  dictionaries: [
    { id: 'dict-1', dictType: 'subject', code: 'math', label: '数学', value: 'math' },
    { id: 'dict-2', dictType: 'channel', code: 'wechat', label: '微信', value: 'wechat' },
  ],
  students: [
    { id: 'student-001', studentNo: 'ST-001', name: '李一诺', gradeLabel: 'G4', familyId: 'family-001', status: 'active' },
    { id: 'student-002', studentNo: 'ST-002', name: '王子安', gradeLabel: 'G5', familyId: 'family-001', status: 'trial' },
  ],
  student360: {
    'student-001': {
      student: { id: 'student-001', studentNo: 'ST-001', name: '李一诺', gradeLabel: 'G4', status: 'active' },
      currentEnrollment: { campusId: 'campus-guiyang', termId: '2026-spring', primaryTeacherId: 'teacher-001' },
      family: { id: 'family-001', familyName: '李家', primaryContactName: '李妈妈' },
      guardians: [{ id: 'guardian-001', name: '李妈妈', relation: 'mother' }],
      homeworkSummary: {
        reviewedCount: 6,
        pendingReviewCount: 1,
        averageAccuracyPct: 94,
        latestHomeworkDate: '2026-03-23',
        latestFeedback: '步骤完整度明显提升',
        trend: [{ date: '2026-03-16', accuracyPct: 91 }, { date: '2026-03-23', accuracyPct: 94 }],
      },
      growthSummary: {
        observationCount: 3,
        activeGoalCount: 1,
        latestStrengths: '表达完整',
        latestImprovementNotes: '审题更稳',
        latestObservationDate: '2026-03-20',
        latestReportPeriod: '2026-W12',
      },
      billingSummary: { outstandingAmount: 120000, unpaidInvoiceCount: 1, latestPaymentDate: '2026-03-12', activeContractCount: 1, balanceAmount: 30000 },
      attendanceSummary: { totalMinutes: 95, abnormalCount: 0, lastAttendanceDate: '2026-03-24', presentDays: 18, absentDays: 1, averageStudyMinutes: 95 },
      recentTimeline: [
        { type: '作业', title: '作业复核完成', occurredAt: '2026-03-24 09:00', status: 'reviewed', summary: '正确率 96%' },
        { type: '成长', title: '观察已发布', occurredAt: '2026-03-21 10:00', status: 'published', summary: '专注度提升' },
      ],
    },
    'student-002': {
      student: { id: 'student-002', studentNo: 'ST-002', name: '王子安', gradeLabel: 'G5', status: 'trial' },
      currentEnrollment: { campusId: 'campus-guiyang', termId: '2026-spring', primaryTeacherId: 'teacher-001' },
      family: { id: 'family-001', familyName: '李家', primaryContactName: '李妈妈' },
      guardians: [{ id: 'guardian-001', name: '李妈妈', relation: 'mother' }],
      homeworkSummary: {
        reviewedCount: 2,
        pendingReviewCount: 0,
        averageAccuracyPct: 88,
        latestHomeworkDate: '2026-03-22',
        latestFeedback: '计算速度快',
        trend: [{ date: '2026-03-15', accuracyPct: 85 }, { date: '2026-03-22', accuracyPct: 88 }],
      },
      growthSummary: {
        observationCount: 1,
        activeGoalCount: 1,
        latestStrengths: '计算速度快',
        latestImprovementNotes: '书写整洁度',
        latestObservationDate: '2026-03-18',
        latestReportPeriod: null,
      },
      billingSummary: { outstandingAmount: 0, unpaidInvoiceCount: 0, latestPaymentDate: '2026-03-10', activeContractCount: 1, balanceAmount: 0 },
      attendanceSummary: { totalMinutes: 80, abnormalCount: 1, lastAttendanceDate: '2026-03-24', presentDays: 17, absentDays: 2, averageStudyMinutes: 80 },
      recentTimeline: [
        { type: '作业', title: '试听作业提交', occurredAt: '2026-03-22 09:00', status: 'submitted', summary: '正确率 88%' },
      ],
    },
  },
  teachers: [
    { id: 'teacher-001', employeeNo: 'T-001', name: '张老师', leadSubject: '数学', campusId: 'campus-guiyang', status: 'active' },
  ],
  teacherDetail: {
    teacher: { id: 'teacher-001', employeeNo: 'T-001', name: '张老师', leadSubject: '数学', campusId: 'campus-guiyang', status: 'active' },
    subjects: [{ subject: '数学', gradeRange: 'G3-G6', level: 'advanced' }],
    shifts: [{ id: 'shift-001', weekday: 3, startTime: '18:30', endTime: '20:00', shiftType: 'teaching' }],
    developmentRecords: [{ id: 'dr-001', recordType: 'coaching', title: '课堂观察复盘', status: 'done', occurredAt: '2026-03-10T19:00:00Z' }],
  },
  families: [
    { id: 'family-001', familyCode: 'FA-001', familyName: '李家', primaryContactName: '李妈妈', primaryMobile: '13800000000', status: 'active' },
  ],
  familyDetail: {
    family: { id: 'family-001', familyCode: 'FA-001', familyName: '李家', primaryContactName: '李妈妈', primaryMobile: '13800000000', status: 'active' },
    guardians: [{ id: 'guardian-001', name: '李妈妈', relation: 'mother', mobile: '13800000000', isPrimary: true }],
    students: [{ id: 'student-001', name: '李一诺' }, { id: 'student-002', name: '王子安' }],
    billingSummary: {},
    tasks: [{ id: 'task-001', title: '续费沟通', status: 'open' }],
    communications: [{ id: 'comm-001', topic: '学习反馈', channel: 'wechat' }],
  },
  homeworkSubmissions: [
    { id: 'submission-001', submissionNo: 'HW-001', studentId: 'student-001', teacherId: 'teacher-001', subject: 'math', uploadedAt: '2026-03-23T10:00:00Z', homeworkDate: '2026-03-23', aiStatus: 'completed', finalAccuracyPct: 96, reviewStatus: 'reviewed' },
    { id: 'submission-002', submissionNo: 'HW-002', studentId: 'student-002', teacherId: 'teacher-001', subject: 'math', uploadedAt: '2026-03-22T10:00:00Z', homeworkDate: '2026-03-22', aiStatus: 'pending', finalAccuracyPct: 88, reviewStatus: 'draft' },
  ],
  homeworkDetail: {
    submission: { id: 'submission-001', submissionNo: 'HW-001', studentId: 'student-001', teacherId: 'teacher-001', subject: 'math', reviewStatus: 'reviewed', finalAccuracyPct: 96 },
    files: [{ fileId: 'file-001' }],
    latestAiAnalysis: {
      jobId: 'job-001',
      status: 'completed',
      provider: 'mock-openai',
      modelName: 'gpt-5.4-mini',
      promptVersion: 'qa-runtime-v1',
      rawMarkdown: '# AI 批改摘要\n\n- 正确率建议：96%\n- 主要问题：计算步骤漏写。',
      structuredResult: { accuracyPct: 96, finalErrorSummary: '计算步骤漏写', finalSuggestion: '加强过程书写' },
    },
    review: {
      reviewResult: 'approved',
      finalErrorSummary: '计算步骤漏写',
      finalSuggestion: '加强过程书写',
      finalAccuracyPct: 96,
      updatedAt: '2026-03-24T09:00:00Z',
      publishToFamily: true,
    },
    reviewDraft: {
      reviewResult: 'approved',
      finalAccuracyPct: 96,
      finalErrorSummary: '计算步骤漏写',
      finalSuggestion: '加强过程书写',
      publishToFamily: true,
      reviewerTeacherId: 'teacher-001',
      savedAt: '2026-03-24T08:30:00Z',
      updatedAt: '2026-03-24T08:40:00Z',
    },
  },
  files: {
    'file-001': {
      fileId: 'file-001',
      fileName: 'math-homework-001.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 235520,
      url: 'https://example.test/math-homework-001.pdf',
      storageProvider: 'mock-s3',
    },
  },
  homeworkErrorTaxonomies: [
    { id: 'taxonomy-001', code: 'CALC', name: '计算错误', subject: 'math', stageScope: 'G3-G6', status: 'active', sortOrder: 10 },
  ],
  growthRubrics: [
    { id: 'rubric-001', campusId: 'campus-guiyang', termId: '2026-spring', name: '数学成长观察模板', status: 'active', dimensions: [{ id: 'dim-001' }, { id: 'dim-002' }], updatedAt: '2026-03-20T08:00:00Z' },
  ],
  growthRubricDetail: {
    id: 'rubric-001',
    name: '数学成长观察模板',
    status: 'active',
    dimensions: [
      { id: 'dim-001', code: 'focus', name: '专注度', weight: 0.5, scoreMin: 1, scoreMax: 5, description: '课堂专注情况', sortOrder: 1 },
      { id: 'dim-002', code: 'accuracy', name: '正确率', weight: 0.5, scoreMin: 1, scoreMax: 5, description: '作业完成质量', sortOrder: 2 },
    ],
  },
  growthObservations: [
    { id: 'observation-001', observationDate: '2026-03-21', studentId: 'student-001', teacherId: 'teacher-001', scene: '课堂观察', totalScore: 9, publishToFamily: true, updatedAt: '2026-03-21T09:00:00Z' },
  ],
  growthGoals: [
    { id: 'goal-001', studentId: 'student-001', goalType: 'habit', title: '每周错题复盘 2 次', currentValue: 1, targetValue: 2, dueDate: '2026-04-15', status: 'active', checkins: [{ id: 'checkin-001', checkinDate: '2026-03-22', progressValue: 1, progressNote: '已完成一次', nextAction: '继续保持' }] },
  ],
  growthReports: [
    { id: 'report-001', studentId: 'student-001', reportType: 'weekly', periodKey: '2026-W12', ownerUserId: 'user-admin', status: 'draft' },
  ],
  growthReportDetail: {
    report: {
      id: 'report-001',
      title: '李一诺成长周报',
      draftMarkdown: '## 成长周报\n\n- 本周作业正确率稳定\n- 课堂专注度提升',
      status: 'draft',
      updatedAt: '2026-03-24T08:00:00Z',
    },
    workflow: {},
  },
  attendanceEvents: [
    { id: 'event-001', studentId: 'student-001', campusId: 'campus-guiyang', eventType: 'checkin', eventTime: '2026-03-24T08:00:00Z', remark: '设备自动写入' },
    { id: 'event-002', studentId: 'student-002', campusId: 'campus-guiyang', eventType: 'late', eventTime: '2026-03-24T08:20:00Z', remark: '补签说明待补录' },
  ],
  attendanceDevices: [
    { id: 'device-001', serialNo: 'DEV-001', deviceType: 'beacon', campusId: 'campus-guiyang', status: 'bound' },
  ],
  attendanceBindings: [
    { id: 'binding-001', deviceId: 'device-001', studentId: 'student-001', boundAt: '2026-03-01T08:00:00Z', unboundAt: null, status: 'active' },
    { id: 'binding-002', deviceId: 'device-001', studentId: 'student-002', boundAt: '2026-02-01T08:00:00Z', unboundAt: '2026-02-28T08:00:00Z', status: 'inactive' },
  ],
  attendanceHomeworkTime: [
    { id: 'time-001', studentId: 'student-001', statDate: '2026-03-23', subject: 'math', totalMinutes: 90, sessionCount: 2 },
  ],
  billingProducts: [
    { id: 'product-001', code: 'COURSE-MATH', name: '数学春季课', billingMode: 'monthly', priceCents: 360000, status: 'active' },
  ],
  billingContracts: [
    { id: 'contract-001', contractNo: 'CT-202603-001', familyId: 'family-001', studentId: 'student-001', startDate: '2026-03-01', endDate: '2026-06-30', payableAmountCents: 1200000, status: 'active' },
  ],
  billingContractDetail: {
    contract: { contractNo: 'CT-202603-001', familyId: 'family-001', studentId: 'student-001', startDate: '2026-03-01', endDate: '2026-06-30', payableAmountCents: 1200000, status: 'active' },
    items: [{ itemName: '数学春季课', quantity: 1, unitPriceCents: 1200000, subtotalCents: 1200000 }],
    invoices: [{ invoiceNo: 'INV-202603-001', status: 'issued', amountCents: 1200000 }],
  },
  billingInvoices: [
    { id: 'invoice-001', invoiceNo: 'INV-202603-001', familyId: 'family-001', studentId: 'student-001', amountCents: 1200000, dueDate: '2026-03-31', status: 'issued' },
  ],
  billingRenewals: [
    { id: 'renewal-001', familyId: 'family-001', studentId: 'student-001', expectedEndDate: '2026-06-30', status: 'tracking', ownerUserId: 'user-admin', nextFollowUpAt: '2026-03-28T09:00:00Z' },
  ],
  communicationRecords: [
    { id: 'record-001', familyId: 'family-001', studentId: 'student-001', channel: 'wechat', direction: 'outbound', topic: '学习反馈', summary: '同步本周学习情况', nextAction: '下周继续跟进', createdAt: '2026-03-21T10:00:00Z', updatedAt: '2026-03-21T10:30:00Z' },
  ],
  communicationTemplates: [
    { id: 'template-001', code: 'weekly-report', name: '成长周报模板', channel: 'wechat', updatedAt: '2026-03-20T12:00:00Z' },
  ],
  communicationMessageTasks: [
    { id: 'message-001', templateId: 'template-001', familyId: 'family-001', studentId: 'student-001', channel: 'wechat', subject: '成长周报', scheduledAt: '2026-03-24T18:00:00Z', status: 'draft' },
    { id: 'message-002', templateId: 'template-001', familyId: 'family-001', studentId: 'student-001', channel: 'wechat', subject: '成长周报', scheduledAt: '2026-03-24T18:00:00Z', status: 'pending' },
    { id: 'message-003', templateId: 'template-001', familyId: 'family-001', studentId: 'student-001', channel: 'wechat', subject: '成长周报', scheduledAt: '2026-03-24T18:00:00Z', sentAt: '2026-03-24T18:02:00Z', status: 'sent' },
    { id: 'message-004', templateId: 'template-001', familyId: 'family-001', studentId: 'student-001', channel: 'wechat', subject: '成长周报', scheduledAt: '2026-03-24T18:00:00Z', failureReason: 'provider timeout', status: 'failed' },
    { id: 'message-005', templateId: 'template-001', familyId: 'family-001', studentId: 'student-001', channel: 'wechat', subject: '成长周报', scheduledAt: '2026-03-24T18:00:00Z', sentAt: '2026-03-24T18:02:00Z', readAt: '2026-03-24T18:10:00Z', status: 'read' },
  ],
  jobs: [
    { jobId: 'job-001', jobType: 'homework-ai-analysis', bizType: 'homework_submission', bizId: 'submission-001', status: 'done', progress: 100, queuedAt: '2026-03-24T08:00:00Z', finishedAt: '2026-03-24T08:05:00Z' },
  ],
  analyticsOverview: {
    activeStudentCount: 2,
    pendingHomeworkCount: 1,
    reportPublishRate: 0.75,
    receivableCents: 1200000,
    receivedCents: 900000,
    todayAttendanceAnomalyCount: 1,
    trend: { receivableCents: 1200000, receivedCents: 900000, renewalTodoCount: 1, communicationTouchCount: 5, messageFailureCount: 1 },
  },
  analyticsTeaching: {
    teacherWorkloads: [{ teacherId: 'teacher-001', teacherName: '张老师', pendingReviewCount: 1, activeStudentCount: 2, communicationCount: 3 }],
    subjectAccuracy: [{ subject: '数学', avgAccuracyPct: 94, sampleCount: 12 }],
    topErrors: [{ label: '计算步骤漏写', count: 4 }],
    growthCoverage: [{ subject: '数学', totalMinutes: 90, sessionCount: 2 }],
    dataSource: { homeworkSubmissionCount: 2, communicationRecordCount: 1, homeworkDailyStatCount: 1, mode: 'db' },
  },
  analyticsBilling: {
    receivableTrend: [{ date: '2026-03-20', amountCents: 400000 }, { date: '2026-03-24', amountCents: 800000 }],
    receivedTrend: [{ date: '2026-03-20', amountCents: 300000 }, { date: '2026-03-24', amountCents: 600000 }],
    agingSummary: [{ bucket: '0-30天', invoiceCount: 1, outstandingCents: 300000 }],
    renewalFunnel: [{ status: 'tracking', count: 1 }],
    contractCount: 1,
    communicationTouchCount: 5,
    messageTaskCount: 5,
  },
};

const REACT_ELEMENT_TYPE = Symbol.for('react.transitional.element');
const REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');

export function ensureWebBuild(repoRoot) {
  const compiledRoot = path.join(repoRoot, 'apps/web/.next/server/app');
  if (statExists(compiledRoot)) {
    return compiledRoot;
  }

  execFileSync('npm', ['run', 'build', '--workspace', '@growthpilot/web'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  return compiledRoot;
}

export async function runCompiledRuntimeSmoke({
  repoRoot,
  routes,
  username = 'admin',
  failFast = false,
  expectForbiddenPrefixes = [],
  expectOkPrefixes = [],
}) {
  ensureWebBuild(repoRoot);
  const persona = resolvePersona(username);
  const results = [];
  const failures = [];

  for (const route of routes) {
    const result = await executeCompiledRoute({ repoRoot, route, persona });
    results.push(result);

    const errors = evaluateCompiledExpectations(result, { expectForbiddenPrefixes, expectOkPrefixes });
    if (errors.length > 0) {
      failures.push({ route, errors, classification: result.classification, status: result.status ?? null });
      if (failFast) {
        break;
      }
    }
  }

  return {
    username,
    runtimeMode: 'compiled',
    routeCount: routes.length,
    selectedRoutes: routes,
    totals: countBy(results, 'classification'),
    failures,
    results,
  };
}

export async function collectCompiledResponsiveMetrics({ repoRoot, routes, username = 'admin' }) {
  const runtime = await runCompiledRuntimeSmoke({
    repoRoot,
    routes,
    username,
    failFast: false,
  });

  const inlineStyleDeclarations = runtime.results.flatMap((result) =>
    result.inlineStyleDeclarations.map((declaration) => ({
      route: result.route,
      ...declaration,
    })),
  );

  return {
    runtimeMode: 'compiled',
    routeExecutionFailures: runtime.failures.length,
    clientBoundaryRoutes: runtime.results.filter((result) => result.clientBoundaries.length > 0).map((result) => result.route),
    inlineStyleDeclarations,
    runtimeResults: runtime.results,
  };
}

function resolvePersona(username) {
  return PERSONAS[username] ?? PERSONAS.admin;
}

async function executeCompiledRoute({ repoRoot, route, persona }) {
  const compiledRoot = path.join(repoRoot, 'apps/web/.next/server/app');
  const pageFile = resolveCompiledPageFile(repoRoot, compiledRoot, route);
  const requestStore = createRequestStore(route, persona);
  const restoreFetch = installMockFetch(persona);

  try {
    const pageModule = await loadCompiledPageModule(pageFile);
    const invocationProps = buildInvocationProps(route);
    const startedAt = Date.now();

    try {
      const rootNode = await workUnitAsyncStorage.run(requestStore, () => pageModule.default(invocationProps));
      const resolution = await resolveRenderedNode(rootNode, 0);
      return {
        route,
        sourcePage: pageModule.__sourcePage ?? null,
        durationMs: Date.now() - startedAt,
        status: null,
        classification: resolution.forbidden ? 'forbidden' : 'ok',
        markers: {
          forbidden: resolution.forbidden,
          login: resolution.text.includes('登录'),
          nextError: false,
        },
        textPreview: resolution.text.slice(0, 240),
        clientBoundaries: resolution.clientBoundaries,
        inlineStyleDeclarations: resolution.inlineStyleDeclarations,
      };
    } catch (error) {
      if (isRedirectError(error)) {
        return {
          route,
          sourcePage: pageModule.__sourcePage ?? null,
          durationMs: Date.now() - startedAt,
          status: 307,
          classification: 'redirect',
          markers: {
            forbidden: false,
            login: getRedirectLocation(error) === '/login',
            nextError: false,
          },
          textPreview: getRedirectLocation(error) ?? '',
          clientBoundaries: [],
          inlineStyleDeclarations: [],
        };
      }

      return {
        route,
        sourcePage: pageModule.__sourcePage ?? null,
        durationMs: Date.now() - startedAt,
        status: 500,
        classification: 'server_error',
        markers: {
          forbidden: false,
          login: false,
          nextError: true,
        },
        textPreview: String(error?.message ?? error).slice(0, 240),
        error: {
          message: error?.message ?? String(error),
          stack: error?.stack ?? null,
        },
        clientBoundaries: [],
        inlineStyleDeclarations: [],
      };
    }
  } finally {
    restoreFetch();
  }
}

async function loadCompiledPageModule(pageFile) {
  const bundle = require(pageFile);
  const loader = findPageLoader(bundle.tree);
  if (!loader) {
    throw new Error(`could not locate page loader for ${pageFile}`);
  }
  const pageModule = await loader();
  pageModule.__sourcePage = findSourcePage(bundle.tree);
  return pageModule;
}

function findPageLoader(node) {
  if (!Array.isArray(node)) {
    return null;
  }

  const metadata = node[2];
  if (metadata?.page?.[0]) {
    return metadata.page[0];
  }

  for (const value of node.slice(1)) {
    const childLoader = findPageLoader(value);
    if (childLoader) {
      return childLoader;
    }
    if (value && typeof value === 'object') {
      for (const nested of Object.values(value)) {
        const nestedLoader = findPageLoader(nested);
        if (nestedLoader) {
          return nestedLoader;
        }
      }
    }
  }

  return null;
}

function findSourcePage(node) {
  if (!Array.isArray(node)) {
    return null;
  }

  const metadata = node[2];
  if (metadata?.page?.[1]) {
    return metadata.page[1];
  }

  for (const value of node.slice(1)) {
    const sourcePage = findSourcePage(value);
    if (sourcePage) {
      return sourcePage;
    }
    if (value && typeof value === 'object') {
      for (const nested of Object.values(value)) {
        const nestedSource = findSourcePage(nested);
        if (nestedSource) {
          return nestedSource;
        }
      }
    }
  }

  return null;
}

async function resolveRenderedNode(node, depth) {
  if (depth > 200) {
    throw new Error('component resolution depth exceeded');
  }

  if (node === null || node === undefined || typeof node === 'boolean') {
    return emptyResolution();
  }

  if (typeof node === 'string' || typeof node === 'number') {
    const text = String(node);
    return {
      text,
      forbidden: text.includes('无权限访问'),
      clientBoundaries: [],
      inlineStyleDeclarations: [],
    };
  }

  if (Array.isArray(node)) {
    return mergeResolutions(await Promise.all(node.map((child) => resolveRenderedNode(child, depth + 1))));
  }

  if (typeof node === 'object' && node.$$typeof === REACT_ELEMENT_TYPE) {
    if (node.type === REACT_FRAGMENT_TYPE) {
      return resolveRenderedNode(node.props?.children, depth + 1);
    }

    if (typeof node.type === 'string') {
      const children = await resolveRenderedNode(node.props?.children, depth + 1);
      return {
        text: children.text,
        forbidden: children.forbidden,
        clientBoundaries: children.clientBoundaries,
        inlineStyleDeclarations: [...extractInlineStyleDeclarations(node.props?.style), ...children.inlineStyleDeclarations],
      };
    }

    if (typeof node.type === 'function') {
      try {
        const rendered = await node.type(node.props ?? {});
        return resolveRenderedNode(rendered, depth + 1);
      } catch (error) {
        if (isClientBoundaryError(error)) {
          const children = await resolveRenderedNode(node.props?.children, depth + 1);
          return {
            text: children.text,
            forbidden: children.forbidden,
            clientBoundaries: [formatClientBoundaryName(error?.message ?? node.type.name ?? 'client-component'), ...children.clientBoundaries],
            inlineStyleDeclarations: children.inlineStyleDeclarations,
          };
        }
        throw error;
      }
    }

    return resolveRenderedNode(node.props?.children, depth + 1);
  }

  return emptyResolution();
}

function emptyResolution() {
  return {
    text: '',
    forbidden: false,
    clientBoundaries: [],
    inlineStyleDeclarations: [],
  };
}

function mergeResolutions(results) {
  return results.reduce(
    (accumulator, result) => ({
      text: `${accumulator.text}${result.text}`,
      forbidden: accumulator.forbidden || result.forbidden,
      clientBoundaries: [...accumulator.clientBoundaries, ...result.clientBoundaries],
      inlineStyleDeclarations: [...accumulator.inlineStyleDeclarations, ...result.inlineStyleDeclarations],
    }),
    emptyResolution(),
  );
}

function extractInlineStyleDeclarations(style) {
  if (!style || typeof style !== 'object') {
    return [];
  }

  const declarations = [];
  for (const property of ['width', 'minWidth', 'maxWidth']) {
    const rawValue = style[property];
    const px = toPxValue(rawValue);
    if (px !== null) {
      declarations.push({
        property,
        value: rawValue,
        px,
      });
    }
  }
  return declarations;
}

function toPxValue(value) {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }

  const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
  return match ? Number(match[1]) : null;
}

function isClientBoundaryError(error) {
  return typeof error?.message === 'string'
    && error.message.includes('from the server')
    && error.message.includes('on the client');
}

function formatClientBoundaryName(message) {
  const match = /call (.+?)\(\) from the server/.exec(message);
  return match?.[1] ?? 'client-component';
}

function isRedirectError(error) {
  return typeof error?.digest === 'string' && error.digest.includes('NEXT_REDIRECT');
}

function getRedirectLocation(error) {
  if (!isRedirectError(error)) {
    return null;
  }

  const parts = String(error.digest).split(';');
  return parts[2] ?? null;
}

function buildInvocationProps(route) {
  const params = {};
  const dynamicMatches = [...route.matchAll(/\/([^/]+-\d+)\b/g)];
  for (const value of Object.values(dynamicRouteValues)) {
    if (route.includes(`/${value}`)) {
      const key = Object.entries(dynamicRouteValues).find(([, candidate]) => candidate === value)?.[0];
      if (key) {
        params[key] = value;
      }
    }
  }

  return {
    params: Promise.resolve(params),
    searchParams: Promise.resolve({}),
  };
}

function createRequestStore(route, persona) {
  const accessToken = `${persona.username}-access-token`;
  const refreshToken = `${persona.username}-refresh-token`;
  const headers = new Headers({
    cookie: `gp_access_token=${accessToken}; gp_refresh_token=${refreshToken}`,
  });
  const cookieStore = RequestCookiesAdapter.seal(new RequestCookies(headers));

  return {
    type: 'request',
    phase: 'render',
    url: { pathname: route, search: '' },
    headers,
    cookies: cookieStore,
    mutableCookies: cookieStore,
    userspaceMutableCookies: cookieStore,
    draftMode: { isEnabled: false },
    isHmrRefresh: false,
    serverComponentsHmrCache: null,
    rootParams: {},
    renderResumeDataCache: null,
  };
}

function installMockFetch(persona) {
  const originalFetch = global.fetch;
  global.fetch = async (input) => {
    const url = new URL(String(input));
    const pathname = url.pathname.replace(/^\/api\/v1/, '') || '/';
    const response = resolveFixtureResponse({ pathname, searchParams: url.searchParams, persona });
    if (!response) {
      throw new Error(`unhandled mock fetch: ${pathname}${url.search}`);
    }
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    });
  };

  return () => {
    global.fetch = originalFetch;
  };
}

function resolveFixtureResponse({ pathname, searchParams, persona }) {
  const envelope = (data, status = 200) => ({
    status,
    body: {
      code: status >= 400 ? 'ERROR' : 'OK',
      message: status >= 400 ? 'mock error' : 'ok',
      data,
      traceId: 'trace-compiled-runtime',
    },
  });
  const page = (list, pageNo = Number(searchParams.get('pageNo') ?? 1), pageSize = Number(searchParams.get('pageSize') ?? Math.max(list.length, 1))) => ({
    list,
    page: {
      pageNo,
      pageSize,
      total: list.length,
    },
  });

  switch (pathname) {
    case '/auth/me':
      return envelope({
        id: persona.id,
        username: persona.username,
        displayName: persona.displayName,
        roles: persona.roles,
        campusIds: persona.campusIds,
        permissions: persona.permissions,
      });
    case '/analytics/overview':
      return envelope(FIXTURES.analyticsOverview);
    case '/analytics/teaching':
      return envelope(FIXTURES.analyticsTeaching);
    case '/analytics/billing':
      return envelope(FIXTURES.analyticsBilling);
    case '/students':
      return envelope(page(FIXTURES.students));
    case '/teachers':
      return envelope(page(FIXTURES.teachers));
    case '/families':
      return envelope(page(FIXTURES.families));
    case '/users':
      return envelope(page(FIXTURES.users));
    case '/settings/campuses':
      return envelope(page(FIXTURES.campuses));
    case '/settings/terms':
      return envelope(page(FIXTURES.terms));
    case '/settings/dictionaries':
      return envelope(page(FIXTURES.dictionaries));
    case '/jobs':
      return persona.permissions.includes('jobs:read') ? envelope(page(FIXTURES.jobs)) : envelope({ list: [], page: { pageNo: 1, pageSize: 20, total: 0 } }, 403);
    case '/homework/submissions':
      return envelope(page(FIXTURES.homeworkSubmissions));
    case '/homework/error-taxonomies':
      return envelope(FIXTURES.homeworkErrorTaxonomies);
    case '/growth/rubrics':
      return envelope(page(FIXTURES.growthRubrics));
    case '/growth/observations':
      return envelope(page(FIXTURES.growthObservations));
    case '/growth/goals':
      return envelope(page(FIXTURES.growthGoals));
    case '/growth/reports':
      return envelope(page(FIXTURES.growthReports));
    case '/attendance/events':
      return envelope(page(FIXTURES.attendanceEvents));
    case '/attendance/devices':
      return envelope(page(FIXTURES.attendanceDevices));
    case '/attendance/devices/bindings': {
      const status = searchParams.get('status');
      const bindings = status ? FIXTURES.attendanceBindings.filter((binding) => binding.status === status) : FIXTURES.attendanceBindings;
      return envelope(page(bindings));
    }
    case '/attendance/homework-time/daily-stats':
      return envelope(page(FIXTURES.attendanceHomeworkTime));
    case '/billing/products':
      return envelope(page(FIXTURES.billingProducts));
    case '/billing/contracts':
      return envelope(page(FIXTURES.billingContracts));
    case '/billing/invoices':
      return envelope(page(FIXTURES.billingInvoices));
    case '/billing/renewals':
      return envelope(page(FIXTURES.billingRenewals));
    case '/communication/records':
      return envelope(page(FIXTURES.communicationRecords));
    case '/communication/templates':
      return envelope(page(FIXTURES.communicationTemplates));
    case '/communication/message-tasks': {
      const status = searchParams.get('status');
      const tasks = status ? FIXTURES.communicationMessageTasks.filter((item) => item.status === status) : FIXTURES.communicationMessageTasks;
      return envelope(page(tasks));
    }
    default:
      break;
  }

  if (pathname.startsWith('/students/') && pathname.endsWith('/360')) {
    const studentId = pathname.split('/')[2];
    return envelope(FIXTURES.student360[studentId] ?? FIXTURES.student360['student-001']);
  }
  if (pathname.startsWith('/teachers/')) {
    return envelope(FIXTURES.teacherDetail);
  }
  if (pathname.startsWith('/families/')) {
    return envelope(FIXTURES.familyDetail);
  }
  if (pathname.startsWith('/homework/submissions/')) {
    return envelope(FIXTURES.homeworkDetail);
  }
  if (pathname.startsWith('/files/')) {
    const fileId = pathname.split('/')[2];
    return envelope(FIXTURES.files[fileId] ?? FIXTURES.files['file-001']);
  }
  if (pathname.startsWith('/growth/rubrics/')) {
    return envelope(FIXTURES.growthRubricDetail);
  }
  if (pathname.startsWith('/growth/reports/')) {
    return envelope(FIXTURES.growthReportDetail);
  }
  if (pathname.startsWith('/billing/contracts/')) {
    return envelope(FIXTURES.billingContractDetail);
  }
  if (pathname.startsWith('/communication/records/')) {
    return envelope(FIXTURES.communicationRecords[0]);
  }

  return null;
}

function resolveCompiledPageFile(repoRoot, compiledRoot, route) {
  const sourceRoot = path.join(repoRoot, 'apps/web/src/app');
  const sourcePageFile = findSourcePageFileForRoute(sourceRoot, route);
  if (!sourcePageFile) {
    throw new Error(`could not resolve source page for ${route}`);
  }

  const relativeDir = path.relative(sourceRoot, path.dirname(sourcePageFile));
  const compiledPageFile = path.join(compiledRoot, relativeDir, 'page.js');
  if (!statExists(compiledPageFile)) {
    throw new Error(`compiled page missing for ${route}: ${compiledPageFile}`);
  }

  return compiledPageFile;
}

function findSourcePageFileForRoute(sourceRoot, route) {
  const candidates = [];
  walk(sourceRoot, (file) => {
    if (!file.endsWith(`${path.sep}page.tsx`)) {
      return;
    }

    const relativeDir = path.relative(sourceRoot, path.dirname(file));
    const segments = relativeDir
      .split(path.sep)
      .filter(Boolean)
      .filter((segment) => !/^\(.*\)$/.test(segment));
    const routePattern = '/' + segments.map((segment) => {
      const match = /^\[(.+)\]$/.exec(segment);
      return match ? dynamicRouteValues[match[1]] ?? match[1] : segment;
    }).join('/');
    const normalizedRoute = routePattern === '/' ? '/' : routePattern.replace(/\/+/g, '/');

    if (normalizedRoute === route) {
      candidates.push(file);
    }
  });
  return candidates[0] ?? null;
}

function walk(dir, visit) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, visit);
      continue;
    }
    visit(fullPath);
  }
}

function statExists(target) {
  try {
    return statSync(target).isFile() || statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function countBy(list, key) {
  return list.reduce((accumulator, item) => {
    const bucket = item[key];
    accumulator[bucket] = (accumulator[bucket] ?? 0) + 1;
    return accumulator;
  }, {});
}

function evaluateCompiledExpectations(result, { expectForbiddenPrefixes, expectOkPrefixes }) {
  const errors = [];
  if (result.classification === 'server_error') {
    errors.push('unexpected execution error');
  }
  if (matchesPrefix(result.route, expectForbiddenPrefixes) && !result.markers.forbidden) {
    errors.push('expected forbidden marker');
  }
  if (matchesPrefix(result.route, expectOkPrefixes) && !['ok', 'redirect'].includes(result.classification)) {
    errors.push('expected non-error route execution');
  }
  return errors;
}

function matchesPrefix(route, prefixes) {
  return prefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}
