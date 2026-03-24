import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Enrollment, Student } from '@growthpilot/schema/index';
import { MasterDataStore, type PersistedEnrollment, type PersistedStudent } from '../../master-data/master-data.store';

@Injectable()
export class StudentsRepository {
  constructor(private readonly store: MasterDataStore = new MasterDataStore()) {}

  listStudents(): PersistedStudent[] {
    return this.store.read().students;
  }

  listEnrollments(): PersistedEnrollment[] {
    return this.store.read().enrollments;
  }

  listEnrollmentsByStudent(studentId: string): PersistedEnrollment[] {
    return this.listEnrollments().filter((item) => item.studentId === studentId);
  }

  findStudentById(studentId: string): PersistedStudent | undefined {
    return this.listStudents().find((item) => item.id === studentId);
  }

  requireStudentById(studentId: string): PersistedStudent {
    const student = this.findStudentById(studentId);
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    return student;
  }

  createStudent(input: {
    studentNo: string;
    name: string;
    gender?: string;
    birthDate?: string | null;
    schoolName?: string;
    gradeLabel: string;
    className?: string;
    familyId?: string | null;
    photoFileId?: string | null;
    profileNotes?: string;
    status: string;
  }): Student {
    return this.store.transact((state) => {
      if (state.students.some((item) => item.studentNo === input.studentNo)) {
        throw new ConflictException({ code: 'DATA_409', message: 'student_no already exists' });
      }
      if (input.familyId && !state.families.some((item) => item.id === input.familyId)) {
        throw new NotFoundException(`Family ${input.familyId} not found`);
      }
      const now = new Date().toISOString();
      const student: PersistedStudent = {
        id: `student-${String(state.students.length + 1).padStart(3, '0')}`,
        studentNo: input.studentNo,
        name: input.name,
        gender: input.gender,
        birthDate: input.birthDate ?? null,
        schoolName: input.schoolName,
        gradeLabel: input.gradeLabel,
        className: input.className,
        familyId: input.familyId ?? null,
        photoFileId: input.photoFileId ?? null,
        profileNotes: input.profileNotes,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      };
      state.students.unshift(student);
      return student;
    });
  }

  createEnrollment(studentId: string, input: {
    campusId: string;
    termId: string;
    primaryTeacherId?: string | null;
    groupId?: string | null;
    enrollDate: string;
    leaveDate?: string | null;
    leaveReason?: string;
    status: string;
  }): Enrollment {
    return this.store.transact((state) => {
      const student = state.students.find((item) => item.id === studentId);
      if (!student) throw new NotFoundException(`Student ${studentId} not found`);
      if (
        state.enrollments.some(
          (item) => item.studentId === studentId && item.campusId === input.campusId && item.termId === input.termId,
        )
      ) {
        throw new ConflictException({ code: 'DATA_409', message: 'enrollment already exists for student/campus/term' });
      }
      if (input.primaryTeacherId && !state.teachers.some((item) => item.id === input.primaryTeacherId)) {
        throw new NotFoundException(`Teacher ${input.primaryTeacherId} not found`);
      }
      const now = new Date().toISOString();
      const enrollment: PersistedEnrollment = {
        id: `enrollment-${String(state.enrollments.length + 1).padStart(3, '0')}`,
        studentId,
        campusId: input.campusId,
        termId: input.termId,
        primaryTeacherId: input.primaryTeacherId ?? null,
        groupId: input.groupId ?? null,
        enrollDate: input.enrollDate,
        leaveDate: input.leaveDate ?? null,
        leaveReason: input.leaveReason,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      };
      state.enrollments.unshift(enrollment);
      student.updatedAt = now;
      return enrollment;
    });
  }
}
