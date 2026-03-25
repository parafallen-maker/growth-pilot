import { Injectable } from '@nestjs/common';
import type {
  Enrollment,
  Student,
  Student360Aggregate,
  Student360TimelineItem,
} from '@growthpilot/schema/index';
import { normalizePage } from '../../common/base-list-query.dto';
import type { PageResult } from '../../common/api-response';
import { AttendanceRepository } from '../attendance/repository/attendance.repository';
import { BillingRepository } from '../billing/repository/billing.repository';
import { FamiliesRepository } from '../families/repository/families.repository';
import { GrowthRepository } from '../growth/repository/growth.repository';
import { HomeworkRepository } from '../homework/repository/homework.repository';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentQueryDto } from './dto/student-query.dto';
import { StudentsRepository } from './repository/students.repository';

@Injectable()
export class StudentsService {
  constructor(
    private readonly studentsRepository: StudentsRepository = new StudentsRepository(),
    private readonly familiesRepository: FamiliesRepository = new FamiliesRepository(),
    private readonly homeworkRepository: HomeworkRepository = new HomeworkRepository(),
    private readonly growthRepository: GrowthRepository = new GrowthRepository(),
    private readonly attendanceRepository: AttendanceRepository = new AttendanceRepository(),
    private readonly billingRepository: BillingRepository = new BillingRepository(),
  ) {}

  list(query: StudentQueryDto): PageResult<Student> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.studentsRepository.listStudents().filter((student) => {
      if (query.status && student.status !== query.status) return false;
      if (query.grade && student.gradeLabel !== query.grade) return false;
      if (query.campusId) {
        const hasCampus = this.studentsRepository
          .listEnrollmentsByStudent(student.id)
          .some((enrollment) => enrollment.campusId === query.campusId);
        if (!hasCampus) return false;
      }
      if (query.termId) {
        const hasTerm = this.studentsRepository
          .listEnrollmentsByStudent(student.id)
          .some((enrollment) => enrollment.termId === query.termId);
        if (!hasTerm) return false;
      }
      if (query.teacherId) {
        const hasTeacher = this.studentsRepository
          .listEnrollmentsByStudent(student.id)
          .some((enrollment) => enrollment.primaryTeacherId === query.teacherId);
        if (!hasTeacher) return false;
      }
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        return student.name.toLowerCase().includes(keyword) || student.studentNo.toLowerCase().includes(keyword);
      }
      return true;
    });

    const start = (pageNo - 1) * pageSize;
    return {
      list: filtered.slice(start, start + pageSize),
      page: { pageNo, pageSize, total: filtered.length },
    };
  }

  detail(studentId: string): Student {
    return this.studentsRepository.requireStudentById(studentId);
  }

  detail360(studentId: string): Student360Aggregate {
    const student = this.detail(studentId);
    const enrollments = this.studentsRepository.listEnrollmentsByStudent(studentId);
    const currentEnrollment = this.pickCurrentEnrollment(enrollments);
    const family = student.familyId ? this.familiesRepository.findFamilyById(student.familyId) ?? null : null;
    const guardians = family ? this.familiesRepository.listGuardiansByFamily(family.id) : [];

    const studentHomework = this.homeworkRepository.listSubmissions().filter((item) => item.studentId === studentId);
    const studentGrowth = this.growthRepository.listObservations().filter((item) => item.studentId === studentId);
    const activeGoals = this.growthRepository.listGoals().filter((item) => item.studentId === studentId && item.status === 'active');
    const studentReports = this.growthRepository.listReports().filter((item) => item.studentId === studentId);
    const attendanceEvents = this.attendanceRepository.listEvents().filter((item) => item.studentId === studentId);
    const attendanceStats = this.attendanceRepository.listDailyStats().filter((item) => item.studentId === studentId);
    const studentContracts = this.billingRepository.listContracts().filter((item) => item.studentId === studentId);
    const studentInvoices = this.billingRepository.listInvoices().filter((item) => item.studentId === studentId);
    const invoiceIds = new Set(studentInvoices.map((item) => item.id));
    const studentPayments = this.billingRepository.listPayments().filter((item) => invoiceIds.has(item.invoiceId));

    const reviewedHomework = studentHomework.filter((item) => item.finalAccuracyPct != null);
    const averageAccuracyPct = reviewedHomework.length
      ? Math.round(reviewedHomework.reduce((sum, item) => sum + (item.finalAccuracyPct ?? 0), 0) / reviewedHomework.length)
      : null;
    const presentAttendance = attendanceEvents.filter((item) => item.eventType === 'checkin');
    const absentAttendance = [] as typeof attendanceEvents;
    const averageStudyMinutes = attendanceStats.length
      ? Math.round(attendanceStats.reduce((sum, item) => sum + item.totalMinutes, 0) / attendanceStats.length)
      : 0;

    return {
      student,
      currentEnrollment,
      family,
      guardians,
      homeworkSummary: {
        latestSubmissionId: studentHomework[0]?.id ?? null,
        latestHomeworkDate: studentHomework[0]?.homeworkDate ?? null,
        reviewedCount: studentHomework.filter((item) => item.reviewStatus === 'published').length,
        pendingReviewCount: studentHomework.filter((item) => item.reviewStatus !== 'published').length,
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
      recentTimeline: this.buildRecentTimeline(studentId),
    };
  }

  create(payload: CreateStudentDto): Student {
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

  createEnrollment(studentId: string, payload: CreateEnrollmentDto): Enrollment {
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

  private pickCurrentEnrollment(enrollments: Enrollment[]): Enrollment | null {
    return (
      enrollments.find((item) => item.status === 'active') ??
      [...enrollments].sort((a, b) => b.enrollDate.localeCompare(a.enrollDate))[0] ??
      null
    );
  }

  private buildRecentTimeline(studentId: string): Student360TimelineItem[] {
    const student = this.studentsRepository.requireStudentById(studentId);
    const enrollment = this.pickCurrentEnrollment(this.studentsRepository.listEnrollmentsByStudent(studentId));
    const family = student.familyId ? this.familiesRepository.findFamilyById(student.familyId) : null;

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

    const homeworkItems: Student360TimelineItem[] = this.homeworkRepository
      .listSubmissions()
      .filter((item) => item.studentId === studentId)
      .map((item) => ({ id: `timeline-homework-${item.id}`, type: 'homework', title: '作业复核更新', occurredAt: item.updatedAt, status: item.reviewStatus, summary: item.finalErrorSummary ?? undefined }));
    const growthItems: Student360TimelineItem[] = this.growthRepository
      .listObservations()
      .filter((item) => item.studentId === studentId)
      .map((item) => ({ id: `timeline-growth-${item.id}`, type: 'growth', title: '成长观察记录', occurredAt: `${item.observationDate}T19:00:00+08:00`, status: 'recorded', summary: item.improvementNotes }));
    const attendanceItems: Student360TimelineItem[] = this.attendanceRepository
      .listEvents()
      .filter((item) => item.studentId === studentId)
      .slice(0, 1)
      .map((item) => ({ id: `timeline-attendance-${item.id}`, type: 'attendance', title: item.eventType === 'checkin' ? '到校签到' : '出勤异常', occurredAt: item.eventTime, status: item.eventType, summary: item.remark ?? '出勤事件已入库' }));
    const billingItems: Student360TimelineItem[] = this.billingRepository
      .listInvoices()
      .filter((item) => item.studentId === studentId)
      .map((item) => ({ id: `timeline-billing-${item.id}`, type: 'billing', title: '账单状态更新', occurredAt: `${item.issueDate}T12:00:00+08:00`, status: item.status, summary: `账单金额 ${item.amountCents} 分` }));

    return [...masterDataItems, ...homeworkItems, ...growthItems, ...attendanceItems, ...billingItems]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 10);
  }
}
