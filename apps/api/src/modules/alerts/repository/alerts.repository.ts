import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PersistentJsonStore } from '../../../common/persistent-json.store';
import { desc, eq } from 'drizzle-orm';
import { createDb, dbSchema } from '../../../db';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';
import type { Alert, AlertLevel, AlertStatus } from '@growthpilot/schema/index';

interface AlertsState {
  alerts: Alert[];
}

export interface CreateAlertInput {
  alertType: string;
  alertLevel?: AlertLevel;
  title: string;
  content: string;
  sourceType?: string;
  sourceId?: string | null;
  studentId?: string | null;
  familyId?: string | null;
  invoiceId?: string | null;
  resolverUserId?: string | null;
  resolvedAt?: string | null;
  status?: AlertStatus;
}

interface AlertsRepositoryPort {
  listAlerts(): Promise<Alert[]>;
  findAlertById(alertId: string): Promise<Alert | undefined>;
  createAlert(input: CreateAlertInput): Promise<Alert>;
  updateAlert(alertId: string, patch: Partial<Pick<Alert, 'status' | 'resolverUserId' | 'resolvedAt' | 'content'>>): Promise<Alert>;
  runInTransaction<T>(runner: () => Promise<T> | T): Promise<T>;
}

export const alertsRepositorySeed = [
  {
    id: 'alert-001',
    alertType: 'overdue_payment',
    alertLevel: 'high',
    sourceType: 'billing_invoice',
    sourceId: 'invoice-001',
    studentId: 'student-001',
    familyId: 'family-001',
    invoiceId: 'invoice-001',
    title: '张小明 · 账单 INV-202603-001 逾期 12 天',
    content: '应收 ¥3,600，当前已进入催缴跟进队列。',
    status: 'open',
    resolverUserId: null,
    resolvedAt: null,
    createdAt: '2026-03-25T10:00:00+08:00',
    updatedAt: '2026-03-25T10:00:00+08:00',
  },
  {
    id: 'alert-002',
    alertType: 'academic_risk',
    alertLevel: 'medium',
    sourceType: 'homework_review',
    sourceId: 'submission-001',
    studentId: 'student-002',
    familyId: 'family-002',
    invoiceId: null,
    title: '李小红 · 数学正确率连续 3 次低于 60%',
    content: '最近 3 次正确率为 52% → 48% → 55%。',
    status: 'acknowledged',
    resolverUserId: 'user-teacher-001',
    resolvedAt: null,
    createdAt: '2026-03-24T12:00:00+08:00',
    updatedAt: '2026-03-25T08:00:00+08:00',
  },
  {
    id: 'alert-003',
    alertType: 'absent_streak',
    alertLevel: 'medium',
    sourceType: 'attendance_event',
    sourceId: 'attendance-event-001',
    studentId: 'student-003',
    familyId: 'family-003',
    invoiceId: null,
    title: '王小华 · 连续 3 个工作日未签到',
    content: '最后签到时间为 2026-03-21。',
    status: 'resolved',
    resolverUserId: 'user-admin-001',
    resolvedAt: '2026-03-25T18:10:00+08:00',
    createdAt: '2026-03-23T09:00:00+08:00',
    updatedAt: '2026-03-25T18:10:00+08:00',
  },
] satisfies Alert[];

const createInitialState = (): AlertsState => ({ alerts: alertsRepositorySeed.map((alert) => ({ ...alert })) });

class FileAlertsRepository implements AlertsRepositoryPort {
  private readonly store = new PersistentJsonStore<AlertsState>('.data/alerts.json', createInitialState);

  async listAlerts() {
    return [...this.store.get().alerts];
  }

  async findAlertById(alertId: string) {
    return this.store.get().alerts.find((item) => item.id === alertId);
  }

  async createAlert(input: CreateAlertInput) {
    assertCreateStatus(input.status);

    const now = new Date().toISOString();
    let created!: Alert;
    this.store.update((state) => {
      created = {
        id: `alert-${String(state.alerts.length + 1).padStart(3, '0')}`,
        alertType: input.alertType,
        alertLevel: input.alertLevel ?? 'medium',
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        studentId: input.studentId ?? null,
        familyId: input.familyId ?? null,
        invoiceId: input.invoiceId ?? null,
        title: input.title,
        content: input.content,
        status: 'open',
        resolverUserId: input.resolverUserId ?? null,
        resolvedAt: input.resolvedAt ?? null,
        createdAt: now,
        updatedAt: now,
      };
      state.alerts.unshift(created);
    });
    return created;
  }

  async updateAlert(alertId: string, patch: Partial<Pick<Alert, 'status' | 'resolverUserId' | 'resolvedAt' | 'content'>>) {
    let updated!: Alert;
    this.store.update((state) => {
      const alert = state.alerts.find((item) => item.id === alertId);
      if (!alert) throw new NotFoundException(`alert ${alertId} not found`);
      const nextStatus = patch.status ?? alert.status;
      assertTransition(alert.status, nextStatus);
      if (patch.status) alert.status = patch.status;
      if (patch.resolverUserId !== undefined) alert.resolverUserId = patch.resolverUserId;
      if (patch.resolvedAt !== undefined) alert.resolvedAt = patch.resolvedAt;
      if (patch.content !== undefined) alert.content = patch.content;
      alert.updatedAt = new Date().toISOString();
      updated = alert;
    });
    return updated;
  }

  async runInTransaction<T>(runner: () => Promise<T> | T) {
    return runner();
  }
}

class DbAlertsRepository implements AlertsRepositoryPort {
  private readonly db = createDb();

  async listAlerts() {
    const rows = await this.db.select().from(dbSchema.alerts).orderBy(desc(dbSchema.alerts.createdAt));
    return rows.map((row) => this.map(row));
  }

  async findAlertById(alertId: string) {
    const rows = await this.db.select().from(dbSchema.alerts).where(eq(dbSchema.alerts.id, alertId)).limit(1);
    return rows[0] ? this.map(rows[0]) : undefined;
  }

  async createAlert(input: CreateAlertInput) {
    assertCreateStatus(input.status);
    const now = new Date();
    const [created] = await this.db.insert(dbSchema.alerts).values({
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      alertType: input.alertType,
      alertLevel: input.alertLevel ?? 'medium',
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      studentId: input.studentId ?? null,
      familyId: input.familyId ?? null,
      invoiceId: input.invoiceId ?? null,
      title: input.title,
      content: input.content,
      status: 'open',
      resolverUserId: input.resolverUserId ?? null,
      resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : null,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.map(created);
  }

  async updateAlert(alertId: string, patch: Partial<Pick<Alert, 'status' | 'resolverUserId' | 'resolvedAt' | 'content'>>) {
    const current = await this.findAlertById(alertId);
    if (!current) throw new NotFoundException(`alert ${alertId} not found`);
    const nextStatus = patch.status ?? current.status;
    assertTransition(current.status, nextStatus);
    const [updated] = await this.db.update(dbSchema.alerts).set({
      status: patch.status ?? current.status,
      resolverUserId: patch.resolverUserId === undefined ? current.resolverUserId ?? null : patch.resolverUserId,
      resolvedAt: patch.resolvedAt === undefined ? (current.resolvedAt ? new Date(current.resolvedAt) : null) : (patch.resolvedAt ? new Date(patch.resolvedAt) : null),
      content: patch.content ?? current.content,
      updatedAt: new Date(),
    }).where(eq(dbSchema.alerts.id, alertId)).returning();
    return this.map(updated);
  }

  async runInTransaction<T>(runner: () => Promise<T> | T) {
    return runner();
  }

  private map(row: typeof dbSchema.alerts.$inferSelect): Alert {
    return {
      id: row.id,
      alertType: row.alertType,
      alertLevel: row.alertLevel as AlertLevel,
      sourceType: row.sourceType ?? undefined,
      sourceId: row.sourceId ?? null,
      studentId: row.studentId ?? null,
      familyId: row.familyId ?? null,
      invoiceId: row.invoiceId ?? null,
      title: row.title,
      content: row.content,
      status: row.status as AlertStatus,
      resolverUserId: row.resolverUserId ?? null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function assertCreateStatus(status?: AlertStatus) {
  if (status && status !== 'open') {
    throw new ConflictException('new alert must start from open');
  }
}

function assertTransition(current: AlertStatus, next: AlertStatus) {
  if (current === next) return;
  if (current === 'open' && next === 'acknowledged') return;
  if (current === 'acknowledged' && next === 'resolved') return;
  throw new ConflictException(`invalid alert status transition: ${current} -> ${next}`);
}

@Injectable()
export class AlertsRepository {
  private readonly adapter: AlertsRepositoryPort;

  constructor() {
    this.adapter = isDbPersistenceEnabled() ? new DbAlertsRepository() : new FileAlertsRepository();
  }

  listAlerts() {
    return this.adapter.listAlerts();
  }

  findAlertById(alertId: string) {
    return this.adapter.findAlertById(alertId);
  }

  createAlert(input: CreateAlertInput) {
    return this.adapter.createAlert(input);
  }

  updateAlert(alertId: string, patch: Partial<Pick<Alert, 'status' | 'resolverUserId' | 'resolvedAt' | 'content'>>) {
    return this.adapter.updateAlert(alertId, patch);
  }

  runInTransaction<T>(runner: () => Promise<T> | T) {
    return this.adapter.runInTransaction(runner);
  }
}
