import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import type { Teacher, TeacherDevelopmentRecord } from '@growthpilot/schema/index';
import { createDb, dbSchema } from '../../../db';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';
import { FileJsonStore } from '../../../shared/persistence/file-json-store';
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

interface CreateDevelopmentRecordInput {
  recordType: string;
  title: string;
  occurredAt: string;
  observerTeacherId?: string | null;
  strengths?: string;
  improvements?: string;
  actionItems?: string;
  dueDate?: string | null;
  status: string;
  attachmentFileId?: string | null;
  createdBy?: string | null;
}

interface TeacherDevelopmentRecordsStoreShape {
  developmentRecords: TeacherDevelopmentRecord[];
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
  listDevelopmentRecordsByTeacher(teacherId: string): Promise<TeacherDevelopmentRecord[]>;
  create(input: CreateTeacherInput): Promise<Teacher>;
  createDevelopmentRecord(teacherId: string, input: CreateDevelopmentRecordInput): Promise<TeacherDevelopmentRecord>;
}

class FileTeachersRepository implements TeachersRepositoryPort {
  private readonly developmentRecordsStore = new FileJsonStore<TeacherDevelopmentRecordsStoreShape>(
    '.data/teacher-development-records.json',
    () => ({ developmentRecords: [] }),
  );

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

  async listDevelopmentRecordsByTeacher(teacherId: string) {
    return this.developmentRecordsStore.read().developmentRecords.filter((item) => item.teacherId === teacherId);
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

  async createDevelopmentRecord(teacherId: string, input: CreateDevelopmentRecordInput) {
    return this.store.transact((state) => {
      const teacher = state.teachers.find((item) => item.id === teacherId);
      if (!teacher) throw new NotFoundException(`Teacher ${teacherId} not found`);
      if (input.observerTeacherId && !state.teachers.some((item) => item.id === input.observerTeacherId)) {
        throw new NotFoundException(`Observer teacher ${input.observerTeacherId} not found`);
      }

      const now = new Date().toISOString();
      const record: TeacherDevelopmentRecord = {
        id: `teacher-dev-record-${String(this.developmentRecordsStore.read().developmentRecords.length + 1).padStart(3, '0')}`,
        teacherId,
        recordType: input.recordType,
        title: input.title,
        occurredAt: input.occurredAt,
        observerTeacherId: input.observerTeacherId ?? null,
        strengths: input.strengths,
        improvements: input.improvements,
        actionItems: input.actionItems,
        dueDate: input.dueDate ?? null,
        status: input.status,
        attachmentFileId: input.attachmentFileId ?? null,
        createdBy: input.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
      };

      this.developmentRecordsStore.update((storeState) => {
        storeState.developmentRecords.unshift(record);
      });
      teacher.updatedAt = now;
      return record;
    });
  }
}

class DbTeachersRepository implements TeachersRepositoryPort {
  private readonly db = createDb();

  async list() {
    const rows = await this.db.select().from(dbSchema.teachers).orderBy(desc(dbSchema.teachers.createdAt));
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
      .orderBy(desc(dbSchema.teacherAssignments.createdAt));

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

  async listDevelopmentRecordsByTeacher(teacherId: string) {
    const rows = await this.db
      .select()
      .from(dbSchema.developmentRecords)
      .where(eq(dbSchema.developmentRecords.teacherId, teacherId))
      .orderBy(desc(dbSchema.developmentRecords.occurredAt), desc(dbSchema.developmentRecords.createdAt));
    return rows.map((row) => this.mapDevelopmentRecord(row));
  }

  async create(input: CreateTeacherInput) {
    const duplicate = await this.db.select({ id: dbSchema.teachers.id }).from(dbSchema.teachers).where(eq(dbSchema.teachers.employeeNo, input.employeeNo)).limit(1);
    if (duplicate[0]) {
      throw new ConflictException({ code: 'DATA_409', message: 'employee_no already exists' });
    }
    const campus = await this.db.select({ id: dbSchema.campuses.id }).from(dbSchema.campuses).where(eq(dbSchema.campuses.id, input.campusId)).limit(1);
    if (!campus[0]) {
      throw new NotFoundException(`Campus ${input.campusId} not found`);
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

  async createDevelopmentRecord(teacherId: string, input: CreateDevelopmentRecordInput) {
    const teacher = await this.findById(teacherId);
    if (!teacher) throw new NotFoundException(`Teacher ${teacherId} not found`);
    if (input.observerTeacherId) {
      const observer = await this.findById(input.observerTeacherId);
      if (!observer) throw new NotFoundException(`Observer teacher ${input.observerTeacherId} not found`);
    }

    const now = new Date();
    const [created] = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(dbSchema.developmentRecords)
        .values({
          teacherId,
          recordType: input.recordType,
          title: input.title,
          occurredAt: new Date(input.occurredAt),
          observerTeacherId: input.observerTeacherId ?? null,
          strengths: input.strengths ?? null,
          improvements: input.improvements ?? null,
          actionItems: input.actionItems ?? null,
          dueDate: input.dueDate ?? null,
          status: input.status,
          attachmentFileId: input.attachmentFileId ?? null,
          createdBy: input.createdBy ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      await tx.update(dbSchema.teachers).set({ updatedAt: now }).where(eq(dbSchema.teachers.id, teacherId));
      return inserted;
    });

    return this.mapDevelopmentRecord(created);
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

  private mapDevelopmentRecord(row: typeof dbSchema.developmentRecords.$inferSelect): TeacherDevelopmentRecord {
    return {
      id: row.id,
      teacherId: row.teacherId,
      recordType: row.recordType,
      title: row.title,
      occurredAt: row.occurredAt.toISOString(),
      observerTeacherId: row.observerTeacherId ?? null,
      strengths: row.strengths ?? undefined,
      improvements: row.improvements ?? undefined,
      actionItems: row.actionItems ?? undefined,
      dueDate: row.dueDate ?? null,
      status: row.status,
      attachmentFileId: row.attachmentFileId ?? null,
      createdBy: row.createdBy ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

@Injectable()
export class TeachersRepository {
  private readonly adapter: TeachersRepositoryPort;

  constructor() {
    this.adapter = isDbPersistenceEnabled() ? new DbTeachersRepository() : new FileTeachersRepository();
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

  listDevelopmentRecordsByTeacher(teacherId: string) {
    return this.adapter.listDevelopmentRecordsByTeacher(teacherId);
  }

  create(input: CreateTeacherInput) {
    return this.adapter.create(input);
  }

  createDevelopmentRecord(teacherId: string, input: CreateDevelopmentRecordInput) {
    return this.adapter.createDevelopmentRecord(teacherId, input);
  }
}
