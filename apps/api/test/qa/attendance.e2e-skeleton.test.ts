import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';

test('QA-05 设备签到链：register device -> bind student -> attendance event -> homework time -> daily stat executable', async (t) => {
  const { attendanceService } = createQaFixture();

  await t.test('smoke: register/bind/checkin/session/stat path is executable', async () => {
    const device = await attendanceService.createDevice({
      campusId: 'campus-001',
      serialNo: 'QA-BEACON-001',
      deviceType: 'beacon',
      note: 'qa attendance path',
    });
    const binding = await attendanceService.createBinding({
      studentId: 'student-qa-001',
      deviceId: device.id,
      createdBy: 'user-admin-001',
      boundAt: '2026-03-25T07:59:00+08:00',
    });
    const event = await attendanceService.createEvent({
      studentId: 'student-qa-001',
      campusId: 'campus-001',
      deviceId: device.id,
      eventType: 'checkin',
      eventTime: '2026-03-25T08:00:00+08:00',
      operatorUserId: 'user-admin-001',
    });
    const session = await attendanceService.createHomeworkTimeSession({
      studentId: 'student-qa-001',
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      subject: 'math',
      deviceId: device.id,
      sourceType: 'device',
      startTime: '2026-03-25T19:00:00+08:00',
      endTime: '2026-03-25T19:45:00+08:00',
      createdBy: 'user-teacher-001',
    });
    const stats = await attendanceService.getHomeworkTimeDailyStats({
      studentId: 'student-qa-001',
      dateFrom: '2026-03-25',
      dateTo: '2026-03-25',
      pageNo: 1,
      pageSize: 20,
    });

    assert.equal(device.status, 'idle');
    assert.equal(binding.status, 'active');
    assert.ok(event.id.startsWith('attendance-event-'));
    assert.equal(session.durationMinutes, 45);
    assert.equal(stats.list[0]?.totalMinutes, 45);
    assert.equal(stats.list[0]?.sessionCount, 1);
  });

  await t.test('case-idempotent-event-and-query-filters-are-executable', async () => {
    const device = await attendanceService.createDevice({
      campusId: 'campus-001',
      serialNo: 'QA-BEACON-002',
      deviceType: 'beacon',
    });
    await attendanceService.createBinding({
      studentId: 'student-002',
      deviceId: device.id,
      createdBy: 'user-admin-001',
      boundAt: '2026-03-26T07:59:00+08:00',
    });

    const first = await attendanceService.createEvent({
      studentId: 'student-002',
      campusId: 'campus-001',
      deviceId: device.id,
      eventType: 'checkin',
      eventTime: '2026-03-26T08:00:00+08:00',
    }, 'qa-attendance-event-001');
    const replay = await attendanceService.createEvent({
      studentId: 'student-002',
      campusId: 'campus-001',
      deviceId: device.id,
      eventType: 'checkin',
      eventTime: '2026-03-26T08:00:00+08:00',
    }, 'qa-attendance-event-001');
    const queried = await attendanceService.listEvents({
      studentId: 'student-002',
      eventType: 'checkin',
      dateFrom: '2026-03-26',
      dateTo: '2026-03-26',
      pageNo: 1,
      pageSize: 20,
    });

    assert.equal(first.id, replay.id);
    assert.equal((replay as { replayed?: boolean }).replayed, true);
    assert.equal(queried.page.total, 1);
    assert.equal(queried.list[0]?.studentId, 'student-002');
  });

  await t.test('case-binding-and-device-student-guardrails-are-enforced', async () => {
    const device = await attendanceService.createDevice({
      campusId: 'campus-001',
      serialNo: 'QA-BEACON-003',
      deviceType: 'beacon',
    });
    await attendanceService.createBinding({
      studentId: 'student-qa-003',
      deviceId: device.id,
      createdBy: 'user-admin-001',
      boundAt: '2026-03-27T07:59:00+08:00',
    });

    await assert.rejects(() => attendanceService.createEvent({
      studentId: 'student-qa-004',
      campusId: 'campus-001',
      deviceId: device.id,
      eventType: 'checkin',
      eventTime: '2026-03-27T08:00:00+08:00',
    }), /device is actively bound to another student/i);

    await assert.rejects(() => attendanceService.createHomeworkTimeSession({
      studentId: 'student-qa-004',
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      subject: 'math',
      deviceId: device.id,
      sourceType: 'device',
      startTime: '2026-03-27T19:00:00+08:00',
      endTime: '2026-03-27T19:30:00+08:00',
    }), /active binding for the same student/i);
  });
});
