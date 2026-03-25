import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { Family, FamilyTask, Guardian, Student } from '@growthpilot/schema/index';
import { createDb, dbSchema } from '../../../db';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';
import { FileJsonStore } from '../../../shared/persistence/file-json-store';
import { MasterDataStore, type PersistedFamily, type PersistedGuardian, type PersistedStudent } from '../../master-data/master-data.store';

interface CreateFamilyInput {
  familyCode: string;
  familyName?: string;
  primaryContactName?: string;
  primaryMobile?: string;
  secondaryMobile?: string;
  familyStructure?: string;
  address?: string;
  communicationPreference?: string;
  notes?: string;
}

interface CreateGuardianInput {
  name: string;
  relation: string;
  mobile?: string;
  wechatId?: string;
  email?: string;
  occupation?: string;
  isPrimary: boolean;
  isEmergency: boolean;
  notes?: string;
}

interface CreateFamilyTaskInput {
  studentId?: string | null;
  sourceType?: string;
  sourceId?: string | null;
  title: string;
  description?: string;
  frequency: string;
  assigneeGuardianId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  status: string;
  createdBy?: string | null;
}

interface FamilyTasksStoreShape {
  tasks: FamilyTask[];
}

interface FamiliesRepositoryPort {
  listFamilies(): Promise<PersistedFamily[]>;
  listStudentsByFamily(familyId: string): Promise<Student[]>;
  listGuardiansByFamily(familyId: string): Promise<PersistedGuardian[]>;
  listTasksByFamily(familyId: string): Promise<FamilyTask[]>;
  findFamilyById(familyId: string): Promise<PersistedFamily | undefined>;
  createFamily(input: CreateFamilyInput): Promise<Family>;
  createGuardian(familyId: string, input: CreateGuardianInput): Promise<Guardian>;
  createTask(familyId: string, input: CreateFamilyTaskInput): Promise<FamilyTask>;
}

class FileFamiliesRepository implements FamiliesRepositoryPort {
  private readonly tasksStore = new FileJsonStore<FamilyTasksStoreShape>('.data/family-tasks.json', () => ({ tasks: [] }));

  constructor(private readonly store: MasterDataStore = new MasterDataStore()) {}

  async listFamilies() {
    return this.store.read().families;
  }

  async listStudentsByFamily(familyId: string) {
    return this.store.read().students.filter((item) => item.familyId === familyId);
  }

  async listGuardiansByFamily(familyId: string) {
    return this.store.read().guardians.filter((item) => item.familyId === familyId);
  }

  async listTasksByFamily(familyId: string) {
    return this.tasksStore.read().tasks.filter((item) => item.familyId === familyId);
  }

  async findFamilyById(familyId: string) {
    return this.store.read().families.find((item) => item.id === familyId);
  }

  async createFamily(input: CreateFamilyInput) {
    return this.store.transact((state) => {
      if (state.families.some((item) => item.familyCode === input.familyCode)) {
        throw new ConflictException({ code: 'DATA_409', message: 'family_code already exists' });
      }
      const now = new Date().toISOString();
      const family: PersistedFamily = {
        id: `family-${String(state.families.length + 1).padStart(3, '0')}`,
        familyCode: input.familyCode,
        familyName: input.familyName,
        primaryContactName: input.primaryContactName,
        primaryMobile: input.primaryMobile,
        secondaryMobile: input.secondaryMobile,
        familyStructure: input.familyStructure,
        address: input.address,
        communicationPreference: input.communicationPreference ?? 'wechat',
        notes: input.notes,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      state.families.unshift(family);
      return family;
    });
  }

  async createGuardian(familyId: string, input: CreateGuardianInput) {
    return this.store.transact((state) => {
      const family = state.families.find((item) => item.id === familyId);
      if (!family) throw new NotFoundException(`Family ${familyId} not found`);
      if (input.isPrimary && state.guardians.some((item) => item.familyId === familyId && item.isPrimary)) {
        throw new ConflictException({ code: 'DATA_409', message: 'primary guardian already exists for family' });
      }
      const now = new Date().toISOString();
      const guardian: PersistedGuardian = {
        id: `guardian-${String(state.guardians.length + 1).padStart(3, '0')}`,
        familyId,
        name: input.name,
        relation: input.relation,
        mobile: input.mobile,
        wechatId: input.wechatId,
        email: input.email,
        occupation: input.occupation,
        isPrimary: input.isPrimary,
        isEmergency: input.isEmergency,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };
      state.guardians.unshift(guardian);
      family.updatedAt = now;
      return guardian;
    });
  }

  async createTask(familyId: string, input: CreateFamilyTaskInput) {
    return this.store.transact((state) => {
      const family = state.families.find((item) => item.id === familyId);
      if (!family) throw new NotFoundException(`Family ${familyId} not found`);
      if (input.studentId && !state.students.some((item) => item.id === input.studentId && item.familyId === familyId)) {
        throw new NotFoundException(`Student ${input.studentId} not found in family ${familyId}`);
      }
      if (input.assigneeGuardianId && !state.guardians.some((item) => item.id === input.assigneeGuardianId && item.familyId === familyId)) {
        throw new NotFoundException(`Guardian ${input.assigneeGuardianId} not found in family ${familyId}`);
      }

      const now = new Date().toISOString();
      const task: FamilyTask = {
        id: `family-task-${String(this.tasksStore.read().tasks.length + 1).padStart(3, '0')}`,
        familyId,
        studentId: input.studentId ?? null,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        title: input.title,
        description: input.description,
        frequency: input.frequency,
        assigneeGuardianId: input.assigneeGuardianId ?? null,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        status: input.status,
        completionNote: undefined,
        completedAt: null,
        createdBy: input.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
      };

      this.tasksStore.update((taskState) => {
        taskState.tasks.unshift(task);
      });
      family.updatedAt = now;
      return task;
    });
  }
}

class DbFamiliesRepository implements FamiliesRepositoryPort {
  private readonly db = createDb();

  async listFamilies() {
    const rows = await this.db.select().from(dbSchema.families).orderBy(asc(dbSchema.families.createdAt));
    return rows.map((row) => this.mapFamily(row));
  }

  async listStudentsByFamily(familyId: string) {
    const rows = await this.db.select().from(dbSchema.students).where(eq(dbSchema.students.familyId, familyId)).orderBy(asc(dbSchema.students.createdAt));
    return rows.map((row) => this.mapStudent(row));
  }

  async listGuardiansByFamily(familyId: string) {
    const rows = await this.db.select().from(dbSchema.guardians).where(eq(dbSchema.guardians.familyId, familyId)).orderBy(asc(dbSchema.guardians.createdAt));
    return rows.map((row) => this.mapGuardian(row));
  }

  async listTasksByFamily(familyId: string) {
    const rows = await this.db
      .select()
      .from(dbSchema.familyTasks)
      .where(eq(dbSchema.familyTasks.familyId, familyId))
      .orderBy(asc(dbSchema.familyTasks.createdAt));
    return rows.map((row) => this.mapTask(row));
  }

  async findFamilyById(familyId: string) {
    const rows = await this.db.select().from(dbSchema.families).where(eq(dbSchema.families.id, familyId)).limit(1);
    return rows[0] ? this.mapFamily(rows[0]) : undefined;
  }

  async createFamily(input: CreateFamilyInput) {
    const duplicate = await this.db.select({ id: dbSchema.families.id }).from(dbSchema.families).where(eq(dbSchema.families.familyCode, input.familyCode)).limit(1);
    if (duplicate[0]) {
      throw new ConflictException({ code: 'DATA_409', message: 'family_code already exists' });
    }

    const now = new Date();
    const [created] = await this.db
      .insert(dbSchema.families)
      .values({
        familyCode: input.familyCode,
        familyName: input.familyName,
        primaryContactName: input.primaryContactName,
        primaryMobile: input.primaryMobile,
        secondaryMobile: input.secondaryMobile,
        familyStructure: input.familyStructure,
        address: input.address,
        communicationPreference: input.communicationPreference ?? 'wechat',
        notes: input.notes,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapFamily(created);
  }

  async createGuardian(familyId: string, input: CreateGuardianInput) {
    const family = await this.findFamilyById(familyId);
    if (!family) throw new NotFoundException(`Family ${familyId} not found`);
    if (input.isPrimary) {
      const guardianRows = await this.listGuardiansByFamily(familyId);
      if (guardianRows.some((item) => item.isPrimary)) {
        throw new ConflictException({ code: 'DATA_409', message: 'primary guardian already exists for family' });
      }
    }

    const now = new Date();
    const [created] = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(dbSchema.guardians)
        .values({
          familyId,
          name: input.name,
          relation: input.relation,
          mobile: input.mobile,
          wechatId: input.wechatId,
          email: input.email,
          occupation: input.occupation,
          isPrimary: String(input.isPrimary),
          isEmergency: String(input.isEmergency),
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      await tx.update(dbSchema.families).set({ updatedAt: now }).where(eq(dbSchema.families.id, familyId));
      return inserted;
    });

    return this.mapGuardian(created);
  }

  async createTask(familyId: string, input: CreateFamilyTaskInput) {
    const family = await this.findFamilyById(familyId);
    if (!family) throw new NotFoundException(`Family ${familyId} not found`);
    if (input.studentId) {
      const studentRows = await this.listStudentsByFamily(familyId);
      if (!studentRows.some((item) => item.id === input.studentId)) {
        throw new NotFoundException(`Student ${input.studentId} not found in family ${familyId}`);
      }
    }
    if (input.assigneeGuardianId) {
      const guardianRows = await this.listGuardiansByFamily(familyId);
      if (!guardianRows.some((item) => item.id === input.assigneeGuardianId)) {
        throw new NotFoundException(`Guardian ${input.assigneeGuardianId} not found in family ${familyId}`);
      }
    }

    const now = new Date();
    const [created] = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(dbSchema.familyTasks)
        .values({
          familyId,
          studentId: input.studentId ?? null,
          sourceType: input.sourceType ?? null,
          sourceId: input.sourceId ?? null,
          title: input.title,
          description: input.description ?? null,
          frequency: input.frequency,
          assigneeGuardianId: input.assigneeGuardianId ?? null,
          startDate: input.startDate ?? null,
          dueDate: input.dueDate ?? null,
          status: input.status,
          createdBy: input.createdBy ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      await tx.update(dbSchema.families).set({ updatedAt: now }).where(eq(dbSchema.families.id, familyId));
      return inserted;
    });

    return this.mapTask(created);
  }

  private mapFamily(row: typeof dbSchema.families.$inferSelect): PersistedFamily {
    return {
      id: row.id,
      familyCode: row.familyCode,
      familyName: row.familyName ?? undefined,
      primaryContactName: row.primaryContactName ?? undefined,
      primaryMobile: row.primaryMobile ?? undefined,
      secondaryMobile: row.secondaryMobile ?? undefined,
      familyStructure: row.familyStructure ?? undefined,
      address: row.address ?? undefined,
      communicationPreference: row.communicationPreference ?? undefined,
      notes: row.notes ?? undefined,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapGuardian(row: typeof dbSchema.guardians.$inferSelect): PersistedGuardian {
    return {
      id: row.id,
      familyId: row.familyId,
      name: row.name,
      relation: row.relation,
      mobile: row.mobile ?? undefined,
      wechatId: row.wechatId ?? undefined,
      email: row.email ?? undefined,
      occupation: row.occupation ?? undefined,
      isPrimary: row.isPrimary === 'true',
      isEmergency: row.isEmergency === 'true',
      notes: row.notes ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
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
      status: row.status,
      photoFileId: row.photoFileId ?? null,
      profileNotes: row.profileNotes ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapTask(row: typeof dbSchema.familyTasks.$inferSelect): FamilyTask {
    return {
      id: row.id,
      familyId: row.familyId,
      studentId: row.studentId ?? null,
      sourceType: row.sourceType ?? undefined,
      sourceId: row.sourceId ?? null,
      title: row.title,
      description: row.description ?? undefined,
      frequency: row.frequency,
      assigneeGuardianId: row.assigneeGuardianId ?? null,
      startDate: row.startDate ?? null,
      dueDate: row.dueDate ?? null,
      status: row.status,
      completionNote: row.completionNote ?? undefined,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdBy: row.createdBy ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

@Injectable()
export class FamiliesRepository {
  private readonly adapter: FamiliesRepositoryPort;

  constructor(store?: MasterDataStore) {
    this.adapter = isDbPersistenceEnabled() ? new DbFamiliesRepository() : new FileFamiliesRepository(store);
  }

  listFamilies() {
    return this.adapter.listFamilies();
  }

  listStudentsByFamily(familyId: string) {
    return this.adapter.listStudentsByFamily(familyId);
  }

  listGuardiansByFamily(familyId: string) {
    return this.adapter.listGuardiansByFamily(familyId);
  }

  listTasksByFamily(familyId: string) {
    return this.adapter.listTasksByFamily(familyId);
  }

  findFamilyById(familyId: string) {
    return this.adapter.findFamilyById(familyId);
  }

  async requireFamilyById(familyId: string) {
    const family = await this.findFamilyById(familyId);
    if (!family) throw new NotFoundException(`Family ${familyId} not found`);
    return family;
  }

  createFamily(input: CreateFamilyInput) {
    return this.adapter.createFamily(input);
  }

  createGuardian(familyId: string, input: CreateGuardianInput) {
    return this.adapter.createGuardian(familyId, input);
  }

  createTask(familyId: string, input: CreateFamilyTaskInput) {
    return this.adapter.createTask(familyId, input);
  }
}
