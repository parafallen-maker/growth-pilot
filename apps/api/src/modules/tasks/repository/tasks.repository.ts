import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PersistentJsonStore } from '../../../common/persistent-json.store';
import { asc, desc, eq } from 'drizzle-orm';
import { createDb, dbSchema } from '../../../db';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';
import type { Task, TaskPriority, TaskStatus } from '@growthpilot/schema/index';

interface TasksState {
  tasks: Task[];
}

export interface CreateTaskInput {
  taskType: string;
  ownerUserId: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueAt?: string | null;
  sourceType?: string;
  sourceId?: string | null;
  studentId?: string | null;
  familyId?: string | null;
  teacherId?: string | null;
  resultNote?: string | null;
  status?: TaskStatus;
}

interface TasksRepositoryPort {
  listTasks(): Promise<Task[]>;
  findTaskById(taskId: string): Promise<Task | undefined>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(taskId: string, patch: Partial<Pick<Task, 'status' | 'resultNote'>>): Promise<Task>;
  runInTransaction<T>(runner: () => Promise<T> | T): Promise<T>;
}

export const tasksRepositorySeed = [
  {
    id: 'task-001',
    taskType: 'homework_followup',
    sourceType: 'homework_review',
    sourceId: 'submission-001',
    studentId: 'student-001',
    familyId: 'family-001',
    teacherId: 'teacher-001',
    ownerUserId: 'user-teacher-001',
    title: '复核张小明 3/25 数学作业',
    description: '完成教师复核后提醒家长反馈。',
    priority: 'high',
    dueAt: '2026-03-26T18:00:00+08:00',
    status: 'open',
    resultNote: null,
    createdAt: '2026-03-25T09:00:00+08:00',
    updatedAt: '2026-03-25T09:00:00+08:00',
  },
  {
    id: 'task-002',
    taskType: 'goal_followup',
    sourceType: 'growth_goal',
    sourceId: 'goal-001',
    studentId: 'student-001',
    familyId: 'family-001',
    teacherId: 'teacher-001',
    ownerUserId: 'user-teacher-001',
    title: '跟进王小华阅读目标',
    description: '记录本周 check-in 结果。',
    priority: 'medium',
    dueAt: '2026-03-28T18:00:00+08:00',
    status: 'in_progress',
    resultNote: null,
    createdAt: '2026-03-24T16:00:00+08:00',
    updatedAt: '2026-03-25T10:00:00+08:00',
  },
  {
    id: 'task-003',
    taskType: 'parent_communication',
    sourceType: 'communication',
    sourceId: 'comm-record-001',
    studentId: 'student-001',
    familyId: 'family-001',
    teacherId: 'teacher-001',
    ownerUserId: 'user-service-001',
    title: '联系赵小飞家长',
    description: '同步阶段表现与后续安排。',
    priority: 'medium',
    dueAt: '2026-03-24T18:00:00+08:00',
    status: 'done',
    resultNote: '已完成电话回访。',
    createdAt: '2026-03-22T10:00:00+08:00',
    updatedAt: '2026-03-24T18:15:00+08:00',
  },
] satisfies Task[];

const createInitialState = (): TasksState => ({ tasks: tasksRepositorySeed.map((task) => ({ ...task })) });

class FileTasksRepository implements TasksRepositoryPort {
  private readonly store = new PersistentJsonStore<TasksState>('.data/tasks.json', createInitialState);

  async listTasks() {
    return [...this.store.get().tasks];
  }

  async findTaskById(taskId: string) {
    return this.store.get().tasks.find((item) => item.id === taskId);
  }

  async createTask(input: CreateTaskInput) {
    assertCreateStatus(input.status);

    const now = new Date().toISOString();
    let created!: Task;
    this.store.update((state) => {
      created = {
        id: `task-${String(state.tasks.length + 1).padStart(3, '0')}`,
        taskType: input.taskType,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        studentId: input.studentId ?? null,
        familyId: input.familyId ?? null,
        teacherId: input.teacherId ?? null,
        ownerUserId: input.ownerUserId,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? 'medium',
        dueAt: input.dueAt ?? null,
        status: 'open',
        resultNote: input.resultNote ?? null,
        createdAt: now,
        updatedAt: now,
      };
      state.tasks.unshift(created);
    });
    return created;
  }

  async updateTask(taskId: string, patch: Partial<Pick<Task, 'status' | 'resultNote'>>) {
    let updated!: Task;
    this.store.update((state) => {
      const task = state.tasks.find((item) => item.id === taskId);
      if (!task) throw new NotFoundException(`task ${taskId} not found`);
      const nextStatus = patch.status ?? task.status;
      assertTransition(task.status, nextStatus, 'task');
      if (patch.status) task.status = patch.status;
      if (patch.resultNote !== undefined) task.resultNote = patch.resultNote;
      task.updatedAt = new Date().toISOString();
      updated = task;
    });
    return updated;
  }

  async runInTransaction<T>(runner: () => Promise<T> | T) {
    return runner();
  }
}

class DbTasksRepository implements TasksRepositoryPort {
  private readonly db = createDb();

  async listTasks() {
    const rows = await this.db.select().from(dbSchema.tasks).orderBy(desc(dbSchema.tasks.createdAt));
    return rows.map((row) => this.map(row));
  }

  async findTaskById(taskId: string) {
    const rows = await this.db.select().from(dbSchema.tasks).where(eq(dbSchema.tasks.id, taskId)).limit(1);
    return rows[0] ? this.map(rows[0]) : undefined;
  }

  async createTask(input: CreateTaskInput) {
    assertCreateStatus(input.status);
    const now = new Date();
    const [created] = await this.db.insert(dbSchema.tasks).values({
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      taskType: input.taskType,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      studentId: input.studentId ?? null,
      familyId: input.familyId ?? null,
      teacherId: input.teacherId ?? null,
      ownerUserId: input.ownerUserId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 'medium',
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      status: 'open',
      resultNote: input.resultNote ?? null,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.map(created);
  }

  async updateTask(taskId: string, patch: Partial<Pick<Task, 'status' | 'resultNote'>>) {
    const current = await this.findTaskById(taskId);
    if (!current) throw new NotFoundException(`task ${taskId} not found`);
    const nextStatus = patch.status ?? current.status;
    assertTransition(current.status, nextStatus, 'task');
    const [updated] = await this.db.update(dbSchema.tasks).set({
      status: patch.status ?? current.status,
      resultNote: patch.resultNote === undefined ? current.resultNote ?? null : patch.resultNote,
      updatedAt: new Date(),
    }).where(eq(dbSchema.tasks.id, taskId)).returning();
    return this.map(updated);
  }

  async runInTransaction<T>(runner: () => Promise<T> | T) {
    return runner();
  }

  private map(row: typeof dbSchema.tasks.$inferSelect): Task {
    return {
      id: row.id,
      taskType: row.taskType,
      sourceType: row.sourceType ?? undefined,
      sourceId: row.sourceId ?? null,
      studentId: row.studentId ?? null,
      familyId: row.familyId ?? null,
      teacherId: row.teacherId ?? null,
      ownerUserId: row.ownerUserId,
      title: row.title,
      description: row.description ?? null,
      priority: row.priority as TaskPriority,
      dueAt: row.dueAt?.toISOString() ?? null,
      status: row.status as TaskStatus,
      resultNote: row.resultNote ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function assertCreateStatus(status?: TaskStatus) {
  if (status && status !== 'open') {
    throw new ConflictException('new task must start from open');
  }
}

function assertTransition(current: TaskStatus, next: TaskStatus, entity: 'task' | 'alert') {
  if (current === next) return;
  if (current === 'open' && next === 'in_progress') return;
  if (current === 'in_progress' && next === 'done') return;
  throw new ConflictException(`invalid ${entity} status transition: ${current} -> ${next}`);
}

@Injectable()
export class TasksRepository {
  private readonly adapter: TasksRepositoryPort;

  constructor() {
    this.adapter = isDbPersistenceEnabled() ? new DbTasksRepository() : new FileTasksRepository();
  }

  listTasks() {
    return this.adapter.listTasks();
  }

  findTaskById(taskId: string) {
    return this.adapter.findTaskById(taskId);
  }

  createTask(input: CreateTaskInput) {
    return this.adapter.createTask(input);
  }

  updateTask(taskId: string, patch: Partial<Pick<Task, 'status' | 'resultNote'>>) {
    return this.adapter.updateTask(taskId, patch);
  }

  runInTransaction<T>(runner: () => Promise<T> | T) {
    return this.adapter.runInTransaction(runner);
  }
}
