import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { Teacher } from '@growthpilot/schema/index';
import { createDb, dbSchema } from '../../../db';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';
import { MasterDataStore, type PersistedTeacher } from '../../master-data/master-data.store';

interface CreateTeacherInput {
  campusId: string;
  employeeNo: string;
  name: string;
  mobile?: string;
  email?: string;
  hireDate?: string | null;
  leadSubject?: string;
  status: string;
}

export interface TeacherAssignmentRecord {
  id: string;
  teacherId: string;
  termId?: string | null;
  campusId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  shiftType: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

interface TeachersRepositoryPort {
  list(): Promise<PersistedTeacher[]>;
  findById(teacherId: string): Promise<PersistedTeacher | undefined>;
  listAssignmentsByTeacher(teacherId: string): Promise<TeacherAssignmentRecord[]>;
  create(input: CreateTeacherInput): Promise<Teacher>;
}

class FileTeachersRepository implements TeachersRepositoryPort {
  constructor(private readonly store: MasterDataStore = new MasterDataStore()) {}

  async list() {
    return this.store.read().teachers;
  }

  async findById(teacherId: string) {
    return this.store.read().teachers.find((item) => item.id === teacherId);
  }

  async listAssignmentsByTeacher(_teacherId: string) {
    return [];
  }

  async create(input: CreateTeacherInput) {
    return this.store.transact((state) => {
      if (state.teachers.some((item) => item.employeeNo === input.employeeNo)) {
        throw new ConflictException({ code: 'DATA_409', message: 'employee_no already exists' });
      }
      const now = new Date().toISOString();
      const teacher: PersistedTeacher = {
        id: `teacher-${String(state.teachers.length + 1).padStart(3, '0')}`,
        campusId: input.campusId,
        employeeNo: input.employeeNo,
        name: input.name,
        mobile: input.mobile,
        email: input.email,
        hireDate: input.hireDate ?? null,
        leadSubject: input.leadSubject,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      };
      state.teachers.unshift(teacher);
      return teacher;
    });
  }
}

class DbTeachersRepository implements TeachersRepositoryPort {
  private readonly db = createDb();

  async list() {
    const rows = await this.db.select().from(dbSchema.teachers).orderBy(asc(dbSchema.teachers.createdAt));
    return rows.map((row) => this.mapTeacher(row));
  }

  async findById(teacherId: string) {
    const rows = await this.db.select().from(dbSchema.teachers).where(eq(dbSchema.teachers.id, teacherId)).limit(1);
    return rows[0] ? this.mapTeacher(rows[0]) : undefined;
  }

  async listAssignmentsByTeacher(teacherId: string) {
    const rows = await this.db
      .select()
      .from(dbSchema.teacherAssignments)
      .where(eq(dbSchema.teacherAssignments.teacherId, teacherId))
      .orderBy(asc(dbSchema.teacherAssignments.createdAt));

    return rows.map((row) => ({
      id: row.id,
      teacherId: row.teacherId,
      termId: row.termId ?? null,
      campusId: row.campusId,
      weekday: Number(row.weekday),
      startTime: row.startTime,
      endTime: row.endTime,
      shiftType: row.shiftType,
      remark: row.remark ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async create(input: CreateTeacherInput) {
    const duplicate = await this.db.select({ id: dbSchema.teachers.id }).from(dbSchema.teachers).where(eq(dbSchema.teachers.employeeNo, input.employeeNo)).limit(1);
    if (duplicate[0]) {
      throw new ConflictException({ code: 'DATA_409', message: 'employee_no already exists' });
    }

    const now = new Date();
    const [created] = await this.db
      .insert(dbSchema.teachers)
      .values({
        campusId: input.campusId,
        employeeNo: input.employeeNo,
        name: input.name,
        mobile: input.mobile,
        email: input.email,
        hireDate: input.hireDate ?? null,
        leadSubject: input.leadSubject,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapTeacher(created);
  }

  private mapTeacher(row: typeof dbSchema.teachers.$inferSelect): PersistedTeacher {
    return {
      id: row.id,
      campusId: row.campusId,
      employeeNo: row.employeeNo,
      name: row.name,
      mobile: row.mobile ?? undefined,
      email: row.email ?? undefined,
      hireDate: row.hireDate ?? null,
      leadSubject: row.leadSubject ?? undefined,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

@Injectable()
export class TeachersRepository {
  private readonly adapter: TeachersRepositoryPort;

  constructor(store?: MasterDataStore) {
    this.adapter = isDbPersistenceEnabled() ? new DbTeachersRepository() : new FileTeachersRepository(store);
  }

  list() {
    return this.adapter.list();
  }

  findById(teacherId: string) {
    return this.adapter.findById(teacherId);
  }

  async requireById(teacherId: string) {
    const teacher = await this.findById(teacherId);
    if (!teacher) throw new NotFoundException(`Teacher ${teacherId} not found`);
    return teacher;
  }

  listAssignmentsByTeacher(teacherId: string) {
    return this.adapter.listAssignmentsByTeacher(teacherId);
  }

  create(input: CreateTeacherInput) {
    return this.adapter.create(input);
  }
}
