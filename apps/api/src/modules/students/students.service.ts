import { Injectable } from '@nestjs/common';
import type {
  Enrollment,
  Student,
  Student360Aggregate,
  Student360TimelineItem,
} from '@growthpilot/schema/index';
import { normalizePage } from '../../common/base-list-query.dto';
import type { PageResult } from '../../common/api-response';
import { FamiliesRepository } from '../families/repository/families.repository';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentQueryDto } from './dto/student-query.dto';
import { StudentsRepository } from './repository/students.repository';

@Injectable()
export class StudentsService {
  private readonly homeworkSnapshots = [
    {
      studentId: 'student-001',
      submissionId: 'submission-001',
      homeworkDate: '2026-03-23',
      reviewStatus: 'published',
      finalAccuracyPct: 88,
      finalErrorSummary: '审题细节还需加强',
    },
    {
      studentId: 'student-001',
      submissionId: 'submission-002',
      homeworkDate: '2026-03-24',
      reviewStatus: 'reviewing',
      finalAccuracyPct: 92,
      finalErrorSummary: '计算步骤更稳定了',
    },
  ] as const;

  private readonly growthSnapshots = [
    {
      studentId: 'student-001',
      observationDate: '2026-03-22',
      scene: 'classroom',
      strengths: '能快速进入课堂状态',
      improvementNotes: '发言前先完整复述题目',
    },
  ] as const;

  private readonly growthGoals = [{ studentId: 'student-001', status: 'active' }, { studentId: 'student-001', status: 'active' }] as const;
  private readonly growthReports = [{ studentId: 'student-001', periodKey: '2026-W12', status: 'published' }] as const;
  private readonly attendanceSnapshots = [
    { studentId: 'student-001', date: '2026-03-24', status: 'present', studyMinutes: 135, isLate: false },
    { studentId: 'student-001', date: '2026-03-23', status: 'present', studyMinutes: 120, isLate: true },
    { studentId: 'student-001', date: '2026-03-21', status: 'absent', studyMinutes: 0, isLate: false },
  ] as const;
  private readonly billingSnapshots = [
    {
      studentId: 'student-001',
      contractId: 'contract-001',
      invoiceId: 'invoice-001',
      invoiceStatus: 'issued',
      outstandingAmount: 1200,
      balanceAmount: 300,
      paymentDate: '2026-03-20',
    },
  ] as const;

  constructor(
    private readonly studentsRepository: StudentsRepository = new StudentsRepository(),
    private readonly familiesRepository: FamiliesRepository = new FamiliesRepository(),
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

    const studentHomework = this.homeworkSnapshots.filter((item) => item.studentId === studentId);
    const studentGrowth = this.growthSnapshots.filter((item) => item.studentId === studentId);
    const activeGoals = this.growthGoals.filter((item) => item.studentId === studentId && item.status === 'active');
    const studentReports = this.growthReports.filter((item) => item.studentId === studentId);
    const attendance = this.attendanceSnapshots.filter((item) => item.studentId === studentId);
    const billing = this.billingSnapshots.filter((item) => item.studentId === studentId);

    const reviewedHomework = studentHomework.filter((item) => item.finalAccuracyPct != null);
    const averageAccuracyPct = reviewedHomework.length
      ? Math.round(reviewedHomework.reduce((sum, item) => sum + (item.finalAccuracyPct ?? 0), 0) / reviewedHomework.length)
      : null;
    const presentAttendance = attendance.filter((item) => item.status === 'present');
    const averageStudyMinutes = presentAttendance.length
      ? Math.round(presentAttendance.reduce((sum, item) => sum + item.studyMinutes, 0) / presentAttendance.length)
      : 0;

    return {
      student,
      currentEnrollment,
      family,
      guardians,
      homeworkSummary: {
        latestSubmissionId: studentHomework[0]?.submissionId ?? null,
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
        lastAttendanceDate: attendance[0]?.date ?? null,
        presentDays: attendance.filter((item) => item.status === 'present').length,
        absentDays: attendance.filter((item) => item.status === 'absent').length,
        lateCount: attendance.filter((item) => item.isLate).length,
        averageStudyMinutes,
      },
      billingSummary: {
        activeContractCount: new Set(billing.map((item) => item.contractId)).size,
        unpaidInvoiceCount: billing.filter((item) => item.outstandingAmount > 0).length,
        outstandingAmount: billing.reduce((sum, item) => sum + item.outstandingAmount, 0),
        balanceAmount: billing.reduce((sum, item) => sum + item.balanceAmount, 0),
        latestPaymentDate: billing[0]?.paymentDate ?? null,
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

    const homeworkItems: Student360TimelineItem[] = this.homeworkSnapshots
      .filter((item) => item.studentId === studentId)
      .map((item) => ({ id: `timeline-homework-${item.submissionId}`, type: 'homework', title: '作业复核更新', occurredAt: `${item.homeworkDate}T18:00:00+08:00`, status: item.reviewStatus, summary: item.finalErrorSummary }));
    const growthItems: Student360TimelineItem[] = this.growthSnapshots
      .filter((item) => item.studentId === studentId)
      .map((item, index) => ({ id: `timeline-growth-${index + 1}`, type: 'growth', title: '成长观察记录', occurredAt: `${item.observationDate}T19:00:00+08:00`, status: 'recorded', summary: item.improvementNotes }));
    const attendanceItems: Student360TimelineItem[] = this.attendanceSnapshots
      .filter((item) => item.studentId === studentId)
      .slice(0, 1)
      .map((item) => ({ id: `timeline-attendance-${item.date}`, type: 'attendance', title: item.status === 'present' ? '到校签到' : '出勤异常', occurredAt: `${item.date}T08:10:00+08:00`, status: item.status, summary: `学习时长 ${item.studyMinutes} 分钟` }));
    const billingItems: Student360TimelineItem[] = this.billingSnapshots
      .filter((item) => item.studentId === studentId)
      .map((item) => ({ id: `timeline-billing-${item.invoiceId}`, type: 'billing', title: '账单状态更新', occurredAt: `${item.paymentDate}T12:00:00+08:00`, status: item.invoiceStatus, summary: `待收 ${item.outstandingAmount} 元，余额 ${item.balanceAmount} 元` }));

    return [...masterDataItems, ...homeworkItems, ...growthItems, ...attendanceItems, ...billingItems]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 10);
  }
}
