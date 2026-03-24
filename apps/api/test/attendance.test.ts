import test from 'node:test';
import assert from 'node:assert/strict';
import { AttendanceRepository } from '../src/modules/attendance/repository/attendance.repository';
import { AttendanceService } from '../src/modules/attendance/service/attendance.service';

function createFixture() {
  const repository = new AttendanceRepository();
  const service = new AttendanceService(repository);
  return { repository, service };
}

test('attendance device/binding/event/homework-time skeleton flows work', () => {
  const { service } = createFixture();

  const createdDevice = service.createDevice({
    campusId: 'campus-001',
    serialNo: 'BEACON-002',
    deviceType: 'beacon',
  });
  assert.equal(createdDevice.status, 'idle');

  const createdBinding = service.createBinding({
    studentId: 'student-002',
    deviceId: createdDevice.id,
    createdBy: 'user-admin-001',
  });
  assert.equal(createdBinding.status, 'active');

  const event = service.createEvent({
    studentId: 'student-002',
    campusId: 'campus-001',
    deviceId: createdDevice.id,
    eventType: 'checkin',
    eventTime: '2026-03-25T16:00:00+08:00',
  });
  assert.match(event.id, /^attendance-event-/);

  const replay = service.createEvent({
    studentId: 'student-002',
    campusId: 'campus-001',
    deviceId: createdDevice.id,
    eventType: 'checkin',
    eventTime: '2026-03-25T16:00:00+08:00',
  });
  assert.equal(replay.id, event.id);
  assert.equal((replay as { replayed?: boolean }).replayed, true);

  const session = service.createHomeworkTimeSession({
    studentId: 'student-002',
    campusId: 'campus-001',
    termId: 'term-2026-spring',
    subject: 'english',
    deviceId: createdDevice.id,
    sourceType: 'device',
    startTime: '2026-03-25T19:00:00+08:00',
    endTime: '2026-03-25T19:30:00+08:00',
    createdBy: 'user-teacher-001',
  });
  assert.equal(session.durationMinutes, 30);

  const stats = service.getHomeworkTimeDailyStats({
    studentId: 'student-002',
    dateFrom: '2026-03-25',
    dateTo: '2026-03-25',
  });
  assert.equal(stats.page.total, 1);
  assert.equal(stats.list[0]?.totalMinutes, 30);
  assert.equal(stats.list[0]?.sessionCount, 1);
});

test('attendance binding uniqueness and explicit unbind flow are enforced', () => {
  const { service } = createFixture();

  const secondDevice = service.createDevice({
    serialNo: 'BEACON-003',
    campusId: 'campus-001',
  });

  assert.throws(() => {
    service.createBinding({
      studentId: 'student-001',
      deviceId: secondDevice.id,
    });
  });

  const updated = service.updateBinding('binding-001', {
    status: 'inactive',
    unboundAt: '2026-03-25T08:00:00+08:00',
  });
  assert.equal(updated.status, 'inactive');
  assert.ok(updated.unboundAt);

  const rebound = service.createBinding({
    studentId: 'student-001',
    deviceId: secondDevice.id,
  });
  assert.equal(rebound.deviceId, secondDevice.id);
});
