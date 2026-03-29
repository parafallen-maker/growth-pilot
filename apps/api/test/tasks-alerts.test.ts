import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { TasksRepository } from '../src/modules/tasks/repository/tasks.repository';
import { TasksService } from '../src/modules/tasks/service/tasks.service';
import { AlertsRepository } from '../src/modules/alerts/repository/alerts.repository';
import { AlertsService } from '../src/modules/alerts/service/alerts.service';

const dataDir = resolve(process.cwd(), '.data');

function resetDataDir() {
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
}

function createFixture() {
  resetDataDir();
  const tasksRepository = new TasksRepository();
  const alertsRepository = new AlertsRepository();
  return {
    tasksRepository,
    tasksService: new TasksService(tasksRepository),
    alertsRepository,
    alertsService: new AlertsService(alertsRepository),
  };
}

test('tasks module supports list/create/status transitions', async () => {
  const { tasksService, tasksRepository } = createFixture();

  const initial = await tasksService.list({ pageNo: 1, pageSize: 20 });
  assert.ok(initial.page.total >= 3);
  assert.equal(initial.list[0]?.status, 'open');

  const created = await tasksService.create({
    taskType: 'homework_followup',
    ownerUserId: 'user-teacher-001',
    title: '新增作业跟进',
    priority: 'high',
    dueAt: '2026-03-29T18:00:00+08:00',
  });
  assert.equal(created.status, 'open');
  assert.equal(created.priority, 'high');

  const inProgress = await tasksService.update(created.id, { status: 'in_progress' });
  assert.equal(inProgress.status, 'in_progress');

  const done = await tasksService.update(created.id, { status: 'done', resultNote: '已完成提醒' });
  assert.equal(done.status, 'done');
  assert.equal(done.resultNote, '已完成提醒');

  await assert.rejects(() => tasksService.update(created.id, { status: 'open' }));
  assert.equal((await tasksRepository.findTaskById(created.id))?.status, 'done');
});

test('alerts module supports list/create/status transitions', async () => {
  const { alertsService, alertsRepository } = createFixture();

  const initial = await alertsService.list({ pageNo: 1, pageSize: 20 });
  assert.ok(initial.page.total >= 3);
  assert.equal(initial.list[0]?.status, 'open');

  const created = await alertsService.create({
    alertType: 'billing_watch',
    alertLevel: 'high',
    title: '新增预警',
    content: '账单到期前提醒',
    studentId: 'student-001',
    familyId: 'family-001',
    invoiceId: 'invoice-001',
  });
  assert.equal(created.status, 'open');
  assert.equal(created.alertLevel, 'high');

  const acknowledged = await alertsService.update(created.id, { status: 'acknowledged', resolverUserId: 'user-admin-001' });
  assert.equal(acknowledged.status, 'acknowledged');
  assert.equal(acknowledged.resolverUserId, 'user-admin-001');

  const resolved = await alertsService.update(created.id, { status: 'resolved', resolvedAt: '2026-03-28T10:30:00+08:00' });
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.resolvedAt, '2026-03-28T10:30:00+08:00');

  await assert.rejects(() => alertsService.update(created.id, { status: 'open' }));
  assert.equal((await alertsRepository.findAlertById(created.id))?.status, 'resolved');
});
