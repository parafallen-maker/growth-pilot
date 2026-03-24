import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CommunicationRepository } from '../src/modules/communication/repository/communication.repository';
import { CommunicationService } from '../src/modules/communication/service/communication.service';

function createFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'growthpilot-communication-'));
  const repository = new CommunicationRepository(join(dir, 'communication.json'));
  const service = new CommunicationService(repository);
  return { repository, service };
}

test('communication records / templates / message tasks skeleton flows work', () => {
  const { service } = createFixture();

  const records = service.listRecords({ pageNo: 1, pageSize: 20, familyId: 'family-001' });
  assert.equal(records.page.total, 1);
  assert.equal(records.list[0]?.channel, 'wechat');

  const record = service.createRecord({
    familyId: 'family-001',
    studentId: 'student-001',
    channel: 'phone',
    direction: 'inbound',
    topic: '作业反馈',
    summary: '家长反馈孩子回家后先完成数学。',
    nextAction: '下次提醒先自查错题。',
  });
  assert.equal(service.getRecord(record.id).summary, '家长反馈孩子回家后先完成数学。');

  const template = service.createTemplate({
    code: 'invoice-reminder',
    name: '账单提醒模板',
    channel: 'wechat',
    subject: '账单提醒',
    bodyTemplate: '您好，{{studentName}} 本期账单金额 {{amount}} 元。',
    variables: ['studentName', 'amount'],
  });
  assert.equal(template.code, 'invoice-reminder');

  const updatedTemplate = service.updateTemplate(template.id, {
    status: 'inactive',
    bodyTemplate: '您好，{{studentName}} 请查收本期账单 {{amount}} 元。',
  });
  assert.equal(updatedTemplate.status, 'inactive');

  const pendingTask = service.createMessageTask({
    templateId: template.id,
    familyId: 'family-001',
    studentId: 'student-001',
    channel: 'wechat',
    subject: '账单提醒',
    body: '您好，请查收账单。',
    scheduledAt: '2026-03-25T09:00:00+08:00',
  });
  assert.equal(pendingTask.status, 'pending');

  const sentTask = service.updateMessageTaskStatus(pendingTask.id, {
    status: 'sent',
    sentAt: '2026-03-25T09:01:00+08:00',
  });
  assert.equal(sentTask.status, 'sent');
  assert.equal(sentTask.sentAt, '2026-03-25T09:01:00+08:00');

  const failedTask = service.createMessageTask({
    familyId: 'family-002',
    studentId: 'student-002',
    channel: 'wechat',
    subject: '周报提醒',
    body: '发送失败样例',
    status: 'failed',
    failureReason: 'provider unavailable',
  });
  assert.equal(failedTask.status, 'failed');

  const tasks = service.listMessageTasks({ pageNo: 1, pageSize: 20, status: 'failed' });
  assert.equal(tasks.page.total >= 1, true);
  assert.equal(tasks.list[0]?.status, 'failed');
});
