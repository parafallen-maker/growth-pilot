import { Injectable, NotFoundException } from '@nestjs/common';
import type { Enrollment, Student } from '@growthpilot/schema/index';
import { normalizePage } from '../../common/base-list-query.dto';
import type { PageResult } from '../../common/api-response';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentQueryDto } from './dto/student-query.dto';

@Injectable()
export class StudentsService {
  private readonly students: Student[] = [
    {
      id: 'student-001',
      studentNo: 'S001',
      name: '小明',
      gender: 'male',
      birthDate: '2017-05-20',
      schoolName: '洪基实验小学',
      gradeLabel: '一年级',
      className: '1班',
      familyId: 'family-001',
      status: 'active',
    },
  ];

  private readonly enrollments: Enrollment[] = [
    {
      id: 'enrollment-001',
      studentId: 'student-001',
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      primaryTeacherId: 'teacher-001',
      groupId: null,
      enrollDate: '2026-02-18',
      leaveDate: null,
      status: 'active',
    },
  ];

  list(query: StudentQueryDto): PageResult<Student> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.students.filter((student) => {
      if (query.status && student.status !== query.status) return false;
      if (query.grade && student.gradeLabel !== query.grade) return false;
      if (query.campusId) {
        const hasCampus = this.enrollments.some(
          (enrollment) => enrollment.studentId === student.id && enrollment.campusId === query.campusId,
        );
        if (!hasCampus) return false;
      }
      if (query.termId) {
        const hasTerm = this.enrollments.some(
          (enrollment) => enrollment.studentId === student.id && enrollment.termId === query.termId,
        );
        if (!hasTerm) return false;
      }
      if (query.teacherId) {
        const hasTeacher = this.enrollments.some(
          (enrollment) => enrollment.studentId === student.id && enrollment.primaryTeacherId === query.teacherId,
        );
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
    const student = this.students.find((item) => item.id === studentId);
    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found`);
    }
    return student;
  }

  create(payload: CreateStudentDto): Student {
    const student: Student = {
      id: `student-${String(this.students.length + 1).padStart(3, '0')}`,
      studentNo: payload.studentNo,
      name: payload.name,
      gender: payload.gender,
      birthDate: payload.birthDate ?? null,
      schoolName: payload.schoolName,
      gradeLabel: payload.gradeLabel,
      className: payload.className,
      familyId: payload.familyId ?? null,
      status: 'active',
    };

    this.students.unshift(student);
    return student;
  }

  createEnrollment(studentId: string, payload: CreateEnrollmentDto): Enrollment {
    this.detail(studentId);

    const enrollment: Enrollment = {
      id: `enrollment-${String(this.enrollments.length + 1).padStart(3, '0')}`,
      studentId,
      campusId: payload.campusId,
      termId: payload.termId,
      primaryTeacherId: payload.primaryTeacherId ?? null,
      groupId: payload.groupId ?? null,
      enrollDate: payload.enrollDate,
      leaveDate: payload.leaveDate ?? null,
      status: payload.status ?? 'active',
    };

    this.enrollments.unshift(enrollment);
    return enrollment;
  }

  listEnrollmentsByStudent(studentId: string) {
    return this.enrollments.filter((item) => item.studentId === studentId);
  }
}
