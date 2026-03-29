import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { closeAllDbPools } from '../src/db/client';
import { AlertsRepository } from '../src/modules/alerts/repository/alerts.repository';
import { AlertsService } from '../src/modules/alerts/service/alerts.service';
import { TasksRepository } from '../src/modules/tasks/repository/tasks.repository';
import { TasksService } from '../src/modules/tasks/service/tasks.service';

const databaseUrl = process.env.DATABASE_URL;
const originalAdapter = process.env.GP_PERSISTENCE_ADAPTER;
const repoRoot = resolve(process.cwd());
const dataDir = resolve(repoRoot, '.data');

if (!databaseUrl) {
  test.skip('tasks/alerts PostgreSQL adapter flows require DATABASE_URL', () => {});
} else {
  process.env.GP_PERSISTENCE_ADAPTER = 'db';

  async function resetTables() {
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await pool.query('TRUNCATE TABLE tasks, alerts RESTART IDENTITY');
    } finally {
      await pool.end();
    }
  }

  test.beforeEach(async () => {
    await resetTables();
    execFileSync(process.execPath, ['--import', 'tsx', 'scripts/migration/backfill-workflow-persistence.mjs'], {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });
  });

  test.after(async () => {
    await resetTables();
    await closeAllDbPools();
    if (originalAdapter == null) {
      delete process.env.GP_PERSISTENCE_ADAPTER;
    } else {
      process.env.GP_PERSISTENCE_ADAPTER = originalAdapter;
    }
  });

  test('tasks module persists list/create/status transitions in PostgreSQL', async () => {
    const tasksService = new TasksService(new TasksRepository());
    const tasksRepository = new TasksRepository();

    const initial = await tasksService.list({ pageNo: 1, pageSize: 20 });
    assert.equal(initial.page.total, 3);
    assert.deepEqual(initial.list.map((item) => item.id), ['task-002', 'task-001', 'task-003']);

    const created = await tasksService.create({
      taskType: 'homework_followup',
      ownerUserId: 'user-teacher-001',
      title: 'DB 新增作业跟进',
      priority: 'high',
      dueAt: '2026-03-29T18:00:00+08:00',
    });
    assert.equal(created.status, 'open');

    const inProgress = await tasksService.update(created.id, { status: 'in_progress' });
    assert.equal(inProgress.status, 'in_progress');

    const done = await tasksService.update(created.id, { status: 'done', resultNote: '已完成 DB 提醒' });
    assert.equal(done.status, 'done');
    assert.equal((await tasksRepository.findTaskById(created.id))?.resultNote, '已完成 DB 提醒');
  });

  test('alerts module persists list/create/status transitions in PostgreSQL', async () => {
    const alertsService = new AlertsService(new AlertsRepository());
    const alertsRepository = new AlertsRepository();

    const initial = await alertsService.list({ pageNo: 1, pageSize: 20 });
    assert.equal(initial.page.total, 3);
    assert.equal(initial.list[0]?.id, 'alert-001');

    const created = await alertsService.create({
      alertType: 'billing_watch',
      alertLevel: 'high',
      title: 'DB 新增预警',
      content: '账单到期前提醒',
      studentId: 'student-001',
      familyId: 'family-001',
      invoiceId: 'invoice-001',
    });
    assert.equal(created.status, 'open');

    const acknowledged = await alertsService.update(created.id, { status: 'acknowledged', resolverUserId: 'user-admin-001' });
    assert.equal(acknowledged.status, 'acknowledged');

    const resolved = await alertsService.update(created.id, { status: 'resolved', resolvedAt: '2026-03-28T10:30:00+08:00' });
    assert.equal(resolved.status, 'resolved');
    assert.equal((await alertsRepository.findAlertById(created.id))?.resolvedAt, '2026-03-28T02:30:00.000Z');
  });

  test('backfill script imports file-backed tasks + alerts into PostgreSQL', async () => {
    await resetTables();
    rmSync(dataDir, { recursive: true, force: true });
    mkdirSync(dataDir, { recursive: true });

    process.env.GP_PERSISTENCE_ADAPTER = 'file';
    const fileTasks = new TasksService(new TasksRepository());
    const fileAlerts = new AlertsService(new AlertsRepository());
    assert.equal((await fileTasks.list({ pageNo: 1, pageSize: 20 })).page.total, 3);
    assert.equal((await fileAlerts.list({ pageNo: 1, pageSize: 20 })).page.total, 3);

    execFileSync(process.execPath, ['--import', 'tsx', 'scripts/migration/backfill-workflow-persistence.mjs'], {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl, GP_PERSISTENCE_ADAPTER: 'file' },
      stdio: 'inherit',
    });

    process.env.GP_PERSISTENCE_ADAPTER = 'db';
    const dbTasks = new TasksService(new TasksRepository());
    const dbAlerts = new AlertsService(new AlertsRepository());
    assert.equal((await dbTasks.list({ pageNo: 1, pageSize: 20 })).page.total, 3);
    assert.equal((await dbAlerts.list({ pageNo: 1, pageSize: 20 })).page.total, 3);
    assert.deepEqual((await dbTasks.list({ pageNo: 1, pageSize: 20 })).list.map((item) => item.id), ['task-002', 'task-001', 'task-003']);
    assert.deepEqual((await dbAlerts.list({ pageNo: 1, pageSize: 20 })).list.map((item) => item.id), ['alert-001', 'alert-002', 'alert-003']);
  });
}
