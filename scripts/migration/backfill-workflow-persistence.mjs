#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';

const repoRoot = resolve(import.meta.dirname, '..', '..');
const databaseUrl = process.env.DATABASE_URL;

const defaultTasks = [
  { id: 'task-001', taskType: 'homework_followup', sourceType: 'homework_review', sourceId: 'submission-001', studentId: 'student-001', familyId: 'family-001', teacherId: 'teacher-001', ownerUserId: 'user-teacher-001', title: '复核张小明 3/25 数学作业', description: '完成教师复核后提醒家长反馈。', priority: 'high', dueAt: '2026-03-26T18:00:00+08:00', status: 'open', resultNote: null, createdAt: '2026-03-25T09:00:00+08:00', updatedAt: '2026-03-25T09:00:00+08:00' },
  { id: 'task-002', taskType: 'goal_followup', sourceType: 'growth_goal', sourceId: 'goal-001', studentId: 'student-001', familyId: 'family-001', teacherId: 'teacher-001', ownerUserId: 'user-teacher-001', title: '跟进王小华阅读目标', description: '记录本周 check-in 结果。', priority: 'medium', dueAt: '2026-03-28T18:00:00+08:00', status: 'in_progress', resultNote: null, createdAt: '2026-03-24T16:00:00+08:00', updatedAt: '2026-03-25T10:00:00+08:00' },
  { id: 'task-003', taskType: 'parent_communication', sourceType: 'communication', sourceId: 'comm-record-001', studentId: 'student-001', familyId: 'family-001', teacherId: 'teacher-001', ownerUserId: 'user-service-001', title: '联系赵小飞家长', description: '同步阶段表现与后续安排。', priority: 'medium', dueAt: '2026-03-24T18:00:00+08:00', status: 'done', resultNote: '已完成电话回访。', createdAt: '2026-03-22T10:00:00+08:00', updatedAt: '2026-03-24T18:15:00+08:00' },
];
const defaultAlerts = [
  { id: 'alert-001', alertType: 'overdue_payment', alertLevel: 'high', sourceType: 'billing_invoice', sourceId: 'invoice-001', studentId: 'student-001', familyId: 'family-001', invoiceId: 'invoice-001', title: '张小明 · 账单 INV-202603-001 逾期 12 天', content: '应收 ¥3,600，当前已进入催缴跟进队列。', status: 'open', resolverUserId: null, resolvedAt: null, createdAt: '2026-03-25T10:00:00+08:00', updatedAt: '2026-03-25T10:00:00+08:00' },
  { id: 'alert-002', alertType: 'academic_risk', alertLevel: 'medium', sourceType: 'homework_review', sourceId: 'submission-001', studentId: 'student-002', familyId: 'family-002', invoiceId: null, title: '李小红 · 数学正确率连续 3 次低于 60%', content: '最近 3 次正确率为 52% → 48% → 55%。', status: 'acknowledged', resolverUserId: 'user-teacher-001', resolvedAt: null, createdAt: '2026-03-24T12:00:00+08:00', updatedAt: '2026-03-25T08:00:00+08:00' },
  { id: 'alert-003', alertType: 'absent_streak', alertLevel: 'medium', sourceType: 'attendance_event', sourceId: 'attendance-event-001', studentId: 'student-003', familyId: 'family-003', invoiceId: null, title: '王小华 · 连续 3 个工作日未签到', content: '最后签到时间为 2026-03-21。', status: 'resolved', resolverUserId: 'user-admin-001', resolvedAt: '2026-03-25T18:10:00+08:00', createdAt: '2026-03-23T09:00:00+08:00', updatedAt: '2026-03-25T18:10:00+08:00' },
];

if (!databaseUrl) throw new Error('DATABASE_URL is required');

const pool = new Pool({ connectionString: databaseUrl });
try {
  const taskRows = loadJsonArray(resolve(repoRoot, '.data/tasks.json'), 'tasks', defaultTasks);
  const alertRows = loadJsonArray(resolve(repoRoot, '.data/alerts.json'), 'alerts', defaultAlerts);
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const task of taskRows) {
      await client.query(`insert into tasks (id, task_type, source_type, source_id, student_id, family_id, teacher_id, owner_user_id, title, description, priority, due_at, status, result_note, created_at, updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        on conflict (id) do nothing`, [task.id, task.taskType, task.sourceType ?? null, task.sourceId ?? null, task.studentId ?? null, task.familyId ?? null, task.teacherId ?? null, task.ownerUserId, task.title, task.description ?? null, task.priority, task.dueAt ?? null, task.status, task.resultNote ?? null, task.createdAt, task.updatedAt]);
    }
    for (const alert of alertRows) {
      await client.query(`insert into alerts (id, alert_type, alert_level, source_type, source_id, student_id, family_id, invoice_id, title, content, status, resolver_user_id, resolved_at, created_at, updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        on conflict (id) do nothing`, [alert.id, alert.alertType, alert.alertLevel, alert.sourceType ?? null, alert.sourceId ?? null, alert.studentId ?? null, alert.familyId ?? null, alert.invoiceId ?? null, alert.title, alert.content, alert.status, alert.resolverUserId ?? null, alert.resolvedAt ?? null, alert.createdAt, alert.updatedAt]);
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
  console.log(JSON.stringify({ status: 'ok', imported: { tasks: taskRows.length, alerts: alertRows.length } }, null, 2));
} finally {
  await pool.end();
}

function loadJsonArray(filePath, key, fallback) {
  if (!existsSync(filePath)) return fallback.map((item) => ({ ...item }));
  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  const rows = parsed?.[key];
  if (!Array.isArray(rows)) throw new Error(`Invalid ${key} payload in ${filePath}`);
  return rows;
}
