import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { Enrollment, Student } from '@growthpilot/schema/index';
import { createDb, dbSchema } from '../../../db';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';
import { MasterDataStore, type PersistedEnrollment, type PersistedStudent } from '../../master-data/master-data.store';

interface CreateStudentInput {
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
}

interface CreateEnrollmentInput {
  campusId: string;
  termId: string;
  primaryTeacherId?: string | null;
  groupId?: string | null;
  enrollDate: string;
  leaveDate?: string | null;
  leaveReason?: string;
  status: string;
}

interface StudentsRepositoryPort {
  listStudents(): Promise<PersistedStudent[]>;
  listEnrollments(): Promise<PersistedEnrollment[]>;
  listEnrollmentsByStudent(studentId: string): Promise<PersistedEnrollment[]>;
  findStudentById(studentId: string): Promise<PersistedStudent | undefined>;
  createStudent(input: CreateStudentInput): Promise<Student>;
  createEnrollment(studentId: string, input: CreateEnrollmentInput): Promise<Enrollment>;
}

class FileStudentsRepository implements StudentsRepositoryPort {
  constructor(private readonly store: MasterDataStore = new MasterDataStore()) {}

  async listStudents() {
    return this.store.read().students;
  }

  async listEnrollments() {
    return this.store.read().enrollments;
  }

  async listEnrollmentsByStudent(studentId: string) {
    return this.store.read().enrollments.filter((item) => item.studentId === studentId);
  }

  async findStudentById(studentId: string) {
    return this.store.read().students.find((item) => item.id === studentId);
  }

  async createStudent(input: CreateStudentInput) {
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

  async createEnrollment(studentId: string, input: CreateEnrollmentInput) {
    return this.store.transact((state) => {
      const student = state.students.find((item) => item.id === studentId);
      if (!student) throw new NotFoundException(`Student ${studentId} not found`);
      if (state.enrollments.some((item) => item.studentId === studentId && item.campusId === input.campusId && item.termId === input.termId)) {
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

class DbStudentsRepository implements StudentsRepositoryPort {
  private readonly db = createDb();

  async listStudents() {
    const rows = await this.db.select().from(dbSchema.students).orderBy(desc(dbSchema.students.createdAt));
    return rows.map((row) => this.mapStudent(row));
  }

  async listEnrollments() {
    const rows = await this.db.select().from(dbSchema.studentEnrollments).orderBy(desc(dbSchema.studentEnrollments.createdAt));
    return rows.map((row) => this.mapEnrollment(row));
  }

  async listEnrollmentsByStudent(studentId: string) {
    const rows = await this.db
      .select()
      .from(dbSchema.studentEnrollments)
      .where(eq(dbSchema.studentEnrollments.studentId, studentId))
      .orderBy(desc(dbSchema.studentEnrollments.createdAt));
    return rows.map((row) => this.mapEnrollment(row));
  }

  async findStudentById(studentId: string) {
    const rows = await this.db.select().from(dbSchema.students).where(eq(dbSchema.students.id, studentId)).limit(1);
    return rows[0] ? this.mapStudent(rows[0]) : undefined;
  }

  async createStudent(input: CreateStudentInput) {
    const duplicate = await this.db.select({ id: dbSchema.students.id }).from(dbSchema.students).where(eq(dbSchema.students.studentNo, input.studentNo)).limit(1);
    if (duplicate[0]) {
      throw new ConflictException({ code: 'DATA_409', message: 'student_no already exists' });
    }
    if (input.familyId) {
      const family = await this.db.select({ id: dbSchema.families.id }).from(dbSchema.families).where(eq(dbSchema.families.id, input.familyId)).limit(1);
      if (!family[0]) {
        throw new NotFoundException(`Family ${input.familyId} not found`);
      }
    }

    const now = new Date();
    const [created] = await this.db
      .insert(dbSchema.students)
      .values({
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
      })
      .returning();

    return this.mapStudent(created);
  }

  async createEnrollment(studentId: string, input: CreateEnrollmentInput) {
    const student = await this.findStudentById(studentId);
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);

    const duplicate = await this.db
      .select({ id: dbSchema.studentEnrollments.id })
      .from(dbSchema.studentEnrollments)
      .where(and(
        eq(dbSchema.studentEnrollments.studentId, studentId),
        eq(dbSchema.studentEnrollments.campusId, input.campusId),
        eq(dbSchema.studentEnrollments.termId, input.termId),
      ))
      .limit(1);
    if (duplicate[0]) {
      throw new ConflictException({ code: 'DATA_409', message: 'enrollment already exists for student/campus/term' });
    }
    if (input.primaryTeacherId) {
      const teacher = await this.db.select({ id: dbSchema.teachers.id }).from(dbSchema.teachers).where(eq(dbSchema.teachers.id, input.primaryTeacherId)).limit(1);
      if (!teacher[0]) {
        throw new NotFoundException(`Teacher ${input.primaryTeacherId} not found`);
      }
    }
    const campus = await this.db.select({ id: dbSchema.campuses.id }).from(dbSchema.campuses).where(eq(dbSchema.campuses.id, input.campusId)).limit(1);
    if (!campus[0]) {
      throw new NotFoundException(`Campus ${input.campusId} not found`);
    }
    const term = await this.db.select().from(dbSchema.schoolTerms).where(eq(dbSchema.schoolTerms.id, input.termId)).limit(1);
    if (!term[0]) {
      throw new NotFoundException(`Term ${input.termId} not found`);
    }
    if (term[0].campusId && term[0].campusId !== input.campusId) {
      throw new ConflictException({ code: 'DATA_409', message: 'term does not belong to campus' });
    }

    const now = new Date();
    const [created] = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(dbSchema.studentEnrollments)
        .values({
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
        })
        .returning();
      await tx.update(dbSchema.students).set({ updatedAt: now }).where(eq(dbSchema.students.id, studentId));
      return inserted;
    });

    return this.mapEnrollment(created);
  }

  private mapStudent(row: typeof dbSchema.students.$inferSelect): PersistedStudent {
    return {
      id: row.id,
      studentNo: row.studentNo,
      name: row.name,
      gender: row.gender ?? undefined,
      birthDate: row.birthDate ?? null,
      schoolName: row.schoolName ?? undefined,
      gradeLabel: row.gradeLabel,
      className: row.className ?? undefined,
      familyId: row.familyId ?? null,
      photoFileId: row.photoFileId ?? null,
      profileNotes: row.profileNotes ?? undefined,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapEnrollment(row: typeof dbSchema.studentEnrollments.$inferSelect): PersistedEnrollment {
    return {
      id: row.id,
      studentId: row.studentId,
      campusId: row.campusId,
      termId: row.termId,
      primaryTeacherId: row.primaryTeacherId ?? null,
      groupId: row.groupId ?? null,
      enrollDate: row.enrollDate,
      leaveDate: row.leaveDate ?? null,
      leaveReason: row.leaveReason ?? undefined,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

@Injectable()
export class StudentsRepository {
  private readonly adapter: StudentsRepositoryPort;

  constructor() {
    this.adapter = isDbPersistenceEnabled() ? new DbStudentsRepository() : new FileStudentsRepository();
  }

  listStudents() {
    return this.adapter.listStudents();
  }

  listEnrollments() {
    return this.adapter.listEnrollments();
  }

  listEnrollmentsByStudent(studentId: string) {
    return this.adapter.listEnrollmentsByStudent(studentId);
  }

  findStudentById(studentId: string) {
    return this.adapter.findStudentById(studentId);
  }

  async requireStudentById(studentId: string) {
    const student = await this.findStudentById(studentId);
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    return student;
  }

  createStudent(input: CreateStudentInput) {
    return this.adapter.createStudent(input);
  }

  createEnrollment(studentId: string, input: CreateEnrollmentInput) {
    return this.adapter.createEnrollment(studentId, input);
  }
}
