import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  Enrollment,
  Student,
  Student360Aggregate,
  Student360TimelineItem,
} from '@growthpilot/schema/index';
import { randomUUID } from 'node:crypto';
import { normalizePage } from '../../common/base-list-query.dto';
import type { PageResult } from '../../common/api-response';
import { AttendanceRepository } from '../attendance/repository/attendance.repository';
import { BillingRepository } from '../billing/repository/billing.repository';
import { FamiliesRepository } from '../families/repository/families.repository';
import { GrowthRepository } from '../growth/repository/growth.repository';
import { HomeworkRepository } from '../homework/repository/homework.repository';
import { JobsService } from '../jobs/service/jobs.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CreateStudentImportDto } from './dto/create-student-import.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentQueryDto } from './dto/student-query.dto';
import { StudentsRepository } from './repository/students.repository';

interface ImportedStudentRow {
  studentNo: string;
  name: string;
  gradeLabel: string;
  gender?: string;
  birthDate?: string | null;
  schoolName?: string;
  className?: string;
  familyCode?: string;
  primaryContactName?: string;
  primaryMobile?: string;
  campusId?: string;
  termId?: string;
  primaryTeacherId?: string;
  status: string;
}

interface StudentImportError {
  rowNumber: number;
  field?: string;
  message: string;
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly studentsRepository: StudentsRepository,
    private readonly familiesRepository: FamiliesRepository,
    private readonly homeworkRepository: HomeworkRepository,
    private readonly growthRepository: GrowthRepository,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly billingRepository: BillingRepository,
    private readonly jobsService: JobsService,
  ) {}

  async list(query: StudentQueryDto): Promise<PageResult<Student>> {
    const { pageNo, pageSize } = normalizePage(query);
    const students = await this.studentsRepository.listStudents();
    const enrollmentMap = new Map<string, Enrollment[]>();

    const getEnrollments = async (studentId: string) => {
      if (!enrollmentMap.has(studentId)) {
        enrollmentMap.set(studentId, await this.studentsRepository.listEnrollmentsByStudent(studentId));
      }
      return enrollmentMap.get(studentId) ?? [];
    };

    const filtered: Student[] = [];
    for (const student of students) {
      if (query.status && student.status !== query.status) continue;
      if (query.grade && student.gradeLabel !== query.grade) continue;
      if (query.campusId) {
        const hasCampus = (await getEnrollments(student.id)).some((enrollment) => enrollment.campusId === query.campusId);
        if (!hasCampus) continue;
      }
      if (query.termId) {
        const hasTerm = (await getEnrollments(student.id)).some((enrollment) => enrollment.termId === query.termId);
        if (!hasTerm) continue;
      }
      if (query.teacherId) {
        const hasTeacher = (await getEnrollments(student.id)).some((enrollment) => enrollment.primaryTeacherId === query.teacherId);
        if (!hasTeacher) continue;
      }
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        if (!student.name.toLowerCase().includes(keyword) && !student.studentNo.toLowerCase().includes(keyword)) continue;
      }
      filtered.push(student);
    }

    const start = (pageNo - 1) * pageSize;
    return { list: filtered.slice(start, start + pageSize), page: { pageNo, pageSize, total: filtered.length } };
  }

  detail(studentId: string): Promise<Student> {
    return this.studentsRepository.requireStudentById(studentId);
  }

  async detail360(studentId: string): Promise<Student360Aggregate> {
    const student = await this.detail(studentId);
    const enrollments = await this.studentsRepository.listEnrollmentsByStudent(studentId);
    const currentEnrollment = this.pickCurrentEnrollment(enrollments);
    const family = student.familyId ? (await this.familiesRepository.findFamilyById(student.familyId)) ?? null : null;
    const guardians = family ? await this.familiesRepository.listGuardiansByFamily(family.id) : [];

    const studentHomework = (await this.homeworkRepository.listSubmissions()).filter((item) => item.studentId === studentId);
    const studentGrowth = (await this.growthRepository.listObservations()).filter((item) => item.studentId === studentId);
    const activeGoals = (await this.growthRepository.listGoals()).filter((item) => item.studentId === studentId && item.status === 'active');
    const studentReports = (await this.growthRepository.listReports()).filter((item) => item.studentId === studentId);
    const attendanceEvents = (await this.attendanceRepository.listEvents()).filter((item) => item.studentId === studentId);
    const attendanceStats = (await this.attendanceRepository.listDailyStats()).filter((item) => item.studentId === studentId);
    const studentContracts = (await this.billingRepository.listContracts()).filter((item) => item.studentId === studentId);
    const studentInvoices = (await this.billingRepository.listInvoices()).filter((item) => item.studentId === studentId);
    const invoiceIds = new Set(studentInvoices.map((item) => item.id));
    const studentPayments = (await this.billingRepository.listPayments()).filter((item) => invoiceIds.has(item.invoiceId));

    const reviewedHomework = studentHomework.filter((item) => item.finalAccuracyPct != null);
    const completedReviewStatuses = new Set(['reviewed', 'published']);
    const averageAccuracyPct = reviewedHomework.length ? Math.round(reviewedHomework.reduce((sum, item) => sum + (item.finalAccuracyPct ?? 0), 0) / reviewedHomework.length) : null;
    const presentAttendance = attendanceEvents.filter((item) => item.eventType === 'checkin');
    const absentAttendance = [] as typeof attendanceEvents;
    const averageStudyMinutes = attendanceStats.length ? Math.round(attendanceStats.reduce((sum, item) => sum + item.totalMinutes, 0) / attendanceStats.length) : 0;

    return {
      student,
      currentEnrollment,
      family,
      guardians,
      homeworkSummary: {
        latestSubmissionId: studentHomework[0]?.id ?? null,
        latestHomeworkDate: studentHomework[0]?.homeworkDate ?? null,
        reviewedCount: studentHomework.filter((item) => completedReviewStatuses.has(item.reviewStatus)).length,
        pendingReviewCount: studentHomework.filter((item) => !completedReviewStatuses.has(item.reviewStatus)).length,
        averageAccuracyPct,
        latestFeedback: studentHomework[0]?.finalErrorSummary ?? null,
        trend: studentHomework.filter((item) => item.finalAccuracyPct != null).map((item) => ({ date: item.homeworkDate, accuracyPct: item.finalAccuracyPct ?? 0 })),
      },
      growthSummary: {
        latestObservationDate: studentGrowth[0]?.observationDate ?? null,
        observationCount: studentGrowth.length,
        activeGoalCount: activeGoals.length,
        latestReportPeriod: studentReports[0]?.periodKey ?? null,
        latestStrengths: studentGrowth[0]?.strengths ?? null,
        latestImprovementNotes: studentGrowth[0]?.improvementNotes ?? null,
      },
      attendanceSummary: {
        lastAttendanceDate: attendanceEvents[0]?.eventTime?.slice(0, 10) ?? null,
        presentDays: presentAttendance.length,
        absentDays: absentAttendance.length,
        lateCount: 0,
        averageStudyMinutes,
      },
      billingSummary: {
        activeContractCount: studentContracts.filter((item) => item.status === 'active').length,
        unpaidInvoiceCount: studentInvoices.filter((item) => item.status !== 'paid').length,
        outstandingAmount: studentInvoices.reduce((sum, item) => {
          const paid = studentPayments.filter((payment) => payment.invoiceId === item.id && payment.status === 'success').reduce((acc, payment) => acc + payment.paidAmountCents, 0);
          return sum + Math.max(item.amountCents - paid, 0);
        }, 0),
        balanceAmount: 0,
        latestPaymentDate: [...studentPayments].sort((a, b) => b.paymentTime.localeCompare(a.paymentTime))[0]?.paymentTime?.slice(0, 10) ?? null,
      },
      recentTimeline: await this.buildRecentTimeline(studentId),
    };
  }

  create(payload: CreateStudentDto): Promise<Student> {
    return this.studentsRepository.createStudent({
      studentNo: payload.studentNo,
      name: payload.name,
      gender: payload.gender,
      birthDate: payload.birthDate,
      schoolName: payload.schoolName,
      gradeLabel: payload.gradeLabel,
      className: payload.className,
      familyId: payload.familyId,
      photoFileId: payload.photoFileId,
      profileNotes: payload.profileNotes,
      status: 'active',
    });
  }

  createEnrollment(studentId: string, payload: CreateEnrollmentDto): Promise<Enrollment> {
    return this.studentsRepository.createEnrollment(studentId, {
      campusId: payload.campusId,
      termId: payload.termId,
      primaryTeacherId: payload.primaryTeacherId,
      groupId: payload.groupId,
      enrollDate: payload.enrollDate,
      leaveDate: payload.leaveDate,
      leaveReason: payload.leaveReason,
      status: payload.status ?? 'active',
    });
  }

  listEnrollmentsByStudent(studentId: string) {
    return this.studentsRepository.listEnrollmentsByStudent(studentId);
  }

  async importStudents(payload: CreateStudentImportDto) {
    const format = this.resolveImportFormat(payload);
    const importType = payload.importType ?? 'students';
    const jobInput = {
      jobType: 'students_import',
      bizType: 'student_import',
      bizId: payload.fileId ?? randomUUID(),
      payload: {
        importType,
        format,
        dryRun: payload.dryRun ?? true,
        fileId: payload.fileId ?? null,
        fileName: payload.fileName ?? null,
      },
    } as const;

    if (!payload.content && !payload.records?.length) {
      return this.toImportJobResponse(this.jobsService.createJob(jobInput));
    }

    const job = await this.jobsService.enqueueAndProcess(jobInput, async () => {
      const importedRows = this.parseImportedRows(payload, format);
      const validation = await this.validateImportedRows(importedRows);
      return {
        importType,
        format,
        dryRun: payload.dryRun ?? true,
        totalRows: importedRows.length,
        validRows: validation.validRows.length,
        invalidRows: validation.errors.length,
        duplicateStudentNos: validation.duplicateStudentNos,
        preview: validation.validRows.slice(0, 20),
        errors: validation.errors,
      };
    });

    return this.toImportJobResponse(job);
  }

  private pickCurrentEnrollment(enrollments: Enrollment[]): Enrollment | null {
    return enrollments.find((item) => item.status === 'active') ?? [...enrollments].sort((a, b) => b.enrollDate.localeCompare(a.enrollDate))[0] ?? null;
  }

  private toImportJobResponse(job: {
    jobId: string;
    jobType: string;
    bizType: string;
    bizId: string;
    status: string;
    progress: number;
    queuedAt: string;
    startedAt?: string | null;
    finishedAt?: string | null;
    payload?: Record<string, unknown>;
    result: Record<string, unknown> | null;
    errorMessage: string | null;
    attempts: number;
  }) {
    return {
      jobId: job.jobId,
      jobType: job.jobType,
      bizType: job.bizType,
      bizId: job.bizId,
      status: job.status,
      progress: job.progress,
      attempts: job.attempts,
      queuedAt: job.queuedAt,
      startedAt: job.startedAt ?? null,
      finishedAt: job.finishedAt ?? null,
      payload: job.payload ?? null,
      result: job.result,
      errorMessage: job.errorMessage,
    };
  }

  private resolveImportFormat(payload: CreateStudentImportDto): 'csv' | 'json' {
    if (payload.format) return payload.format;
    if (payload.fileName?.toLowerCase().endsWith('.csv')) return 'csv';
    if (payload.fileName?.toLowerCase().endsWith('.json')) return 'json';
    if (payload.content?.trim().startsWith('[') || payload.content?.trim().startsWith('{') || payload.records?.length) return 'json';
    return 'csv';
  }

  private parseImportedRows(payload: CreateStudentImportDto, format: 'csv' | 'json'): Array<{ rowNumber: number; row: ImportedStudentRow }> {
    if (payload.records?.length) {
      return payload.records.map((row, index) => ({
        rowNumber: index + 1,
        row: this.normalizeImportedRow(row),
      }));
    }

    const content = payload.content?.trim();
    if (!content) {
      throw new BadRequestException({ code: 'DATA_400', message: 'content or records is required for parsing' });
    }

    if (format === 'json') {
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new BadRequestException({ code: 'DATA_400', message: 'invalid json content' });
      }
      const items = Array.isArray(parsed)
        ? parsed
        : typeof parsed === 'object' && parsed && Array.isArray((parsed as { records?: unknown[] }).records)
          ? (parsed as { records: unknown[] }).records
          : null;
      if (!items) {
        throw new BadRequestException({ code: 'DATA_400', message: 'json content must be an array or { records: [] }' });
      }
      return items.map((row, index) => ({
        rowNumber: index + 1,
        row: this.normalizeImportedRow(row),
      }));
    }

    const csvRows = this.parseCsv(content, payload.delimiter ?? ',');
    if (csvRows.length < 2) {
      return [];
    }
    const [headerRow, ...dataRows] = csvRows;
    const headers = headerRow.map((value) => value.trim());
    return dataRows
      .filter((row) => row.some((cell) => cell.trim().length > 0))
      .map((row, index) => {
        const source = Object.fromEntries(headers.map((header, columnIndex) => [header, row[columnIndex] ?? '']));
        return {
          rowNumber: index + 2,
          row: this.normalizeImportedRow(source),
        };
      });
  }

  private normalizeImportedRow(row: unknown): ImportedStudentRow {
    const source = typeof row === 'object' && row !== null ? row as Record<string, unknown> : {};
    return {
      studentNo: this.asString(source.studentNo ?? source.student_no),
      name: this.asString(source.name),
      gradeLabel: this.asString(source.gradeLabel ?? source.grade_label),
      gender: this.asOptionalString(source.gender),
      birthDate: this.asNullableString(source.birthDate ?? source.birth_date),
      schoolName: this.asOptionalString(source.schoolName ?? source.school_name),
      className: this.asOptionalString(source.className ?? source.class_name),
      familyCode: this.asOptionalString(source.familyCode ?? source.family_code),
      primaryContactName: this.asOptionalString(source.primaryContactName ?? source.primary_contact_name),
      primaryMobile: this.asOptionalString(source.primaryMobile ?? source.primary_mobile),
      campusId: this.asOptionalString(source.campusId ?? source.campus_id),
      termId: this.asOptionalString(source.termId ?? source.term_id),
      primaryTeacherId: this.asOptionalString(source.primaryTeacherId ?? source.primary_teacher_id),
      status: this.asOptionalString(source.status) ?? 'active',
    };
  }

  private async validateImportedRows(importedRows: Array<{ rowNumber: number; row: ImportedStudentRow }>) {
    const existingStudentNos = new Set((await this.studentsRepository.listStudents()).map((student) => student.studentNo));
    const duplicateStudentNos = new Set<string>();
    const seenStudentNos = new Set<string>();
    const validRows: ImportedStudentRow[] = [];
    const errors: StudentImportError[] = [];

    for (const item of importedRows) {
      const { rowNumber, row } = item;
      let hasError = false;
      if (!row.studentNo) {
        errors.push({ rowNumber, field: 'studentNo', message: 'studentNo is required' });
        hasError = true;
      }
      if (!row.name) {
        errors.push({ rowNumber, field: 'name', message: 'name is required' });
        hasError = true;
      }
      if (!row.gradeLabel) {
        errors.push({ rowNumber, field: 'gradeLabel', message: 'gradeLabel is required' });
        hasError = true;
      }
      if (row.studentNo && existingStudentNos.has(row.studentNo)) {
        errors.push({ rowNumber, field: 'studentNo', message: 'studentNo already exists' });
        duplicateStudentNos.add(row.studentNo);
        hasError = true;
      }
      if (row.studentNo && seenStudentNos.has(row.studentNo)) {
        errors.push({ rowNumber, field: 'studentNo', message: 'studentNo duplicated in import payload' });
        duplicateStudentNos.add(row.studentNo);
        hasError = true;
      }
      seenStudentNos.add(row.studentNo);

      if (!hasError) {
        validRows.push(row);
      }
    }

    return {
      validRows,
      errors,
      duplicateStudentNos: [...duplicateStudentNos],
    };
  }

  private parseCsv(content: string, delimiter: string) {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let index = 0; index < content.length; index += 1) {
      const char = content[index];
      const nextChar = content[index + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && char === delimiter) {
        currentRow.push(currentCell);
        currentCell = '';
        continue;
      }
      if (!inQuotes && (char === '\n' || char === '\r')) {
        if (char === '\r' && nextChar === '\n') {
          index += 1;
        }
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        continue;
      }
      currentCell += char;
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }

    return rows;
  }

  private asString(value: unknown) {
    return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
  }

  private asOptionalString(value: unknown) {
    const normalized = this.asString(value);
    return normalized.length ? normalized : undefined;
  }

  private asNullableString(value: unknown) {
    const normalized = this.asString(value);
    return normalized.length ? normalized : null;
  }

  private async buildRecentTimeline(studentId: string): Promise<Student360TimelineItem[]> {
    const student = await this.studentsRepository.requireStudentById(studentId);
    const enrollment = this.pickCurrentEnrollment(await this.studentsRepository.listEnrollmentsByStudent(studentId));
    const family = student.familyId ? await this.familiesRepository.findFamilyById(student.familyId) : null;

    const masterDataItems: Student360TimelineItem[] = [
      {
        id: `timeline-student-${student.id}`,
        type: 'student',
        title: '学生主档已持久化',
        occurredAt: (student as { updatedAt?: string }).updatedAt ?? '2026-03-24T09:20:00+08:00',
        status: student.status,
        summary: `${student.studentNo} · ${student.gradeLabel}`,
      },
      ...(family
        ? [{
            id: `timeline-family-${family.id}`,
            type: 'family',
            title: '家庭主档已关联',
            occurredAt: (family as { updatedAt?: string }).updatedAt ?? '2026-03-24T09:10:00+08:00',
            status: family.status,
            summary: `${family.familyCode} · ${family.primaryContactName ?? family.familyName ?? '未命名家庭'}`,
          } satisfies Student360TimelineItem]
        : []),
      ...(enrollment
        ? [{
            id: `timeline-enrollment-${enrollment.id}`,
            type: 'enrollment',
            title: '在读档已入库',
            occurredAt: (enrollment as { updatedAt?: string }).updatedAt ?? `${enrollment.enrollDate}T09:00:00+08:00`,
            status: enrollment.status,
            summary: `${enrollment.campusId} / ${enrollment.termId}`,
          } satisfies Student360TimelineItem]
        : []),
    ];

    const homeworkItems: Student360TimelineItem[] = (await this.homeworkRepository.listSubmissions())
      .filter((item) => item.studentId === studentId)
      .map((item) => ({ id: `timeline-homework-${item.id}`, type: 'homework', title: '作业复核更新', occurredAt: item.updatedAt, status: item.reviewStatus, summary: item.finalErrorSummary ?? undefined }));
    const growthItems: Student360TimelineItem[] = (await this.growthRepository.listObservations())
      .filter((item) => item.studentId === studentId)
      .map((item) => ({ id: `timeline-growth-${item.id}`, type: 'growth', title: '成长观察记录', occurredAt: `${item.observationDate}T19:00:00+08:00`, status: 'recorded', summary: item.improvementNotes }));
    const attendanceItems: Student360TimelineItem[] = (await this.attendanceRepository.listEvents())
      .filter((item) => item.studentId === studentId)
      .slice(0, 1)
      .map((item) => ({ id: `timeline-attendance-${item.id}`, type: 'attendance', title: item.eventType === 'checkin' ? '到校签到' : '出勤异常', occurredAt: item.eventTime, status: item.eventType, summary: item.remark ?? '出勤事件已入库' }));
    const billingItems: Student360TimelineItem[] = (await this.billingRepository.listInvoices())
      .filter((item) => item.studentId === studentId)
      .map((item) => ({ id: `timeline-billing-${item.id}`, type: 'billing', title: '账单状态更新', occurredAt: `${item.issueDate}T12:00:00+08:00`, status: item.status, summary: `账单金额 ${item.amountCents} 分` }));

    return [...masterDataItems, ...homeworkItems, ...growthItems, ...attendanceItems, ...billingItems]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 10);
  }
}
