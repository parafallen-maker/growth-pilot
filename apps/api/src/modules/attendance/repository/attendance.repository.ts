import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AttendanceDevice,
  AttendanceEvent,
  HomeworkTimeDailyStat,
  HomeworkTimeSession,
  StudentDeviceBinding,
} from '@growthpilot/schema/index';

interface AttendanceState {
  devices: AttendanceDevice[];
  bindings: StudentDeviceBinding[];
  events: AttendanceEvent[];
  sessions: HomeworkTimeSession[];
  dailyStats: HomeworkTimeDailyStat[];
}

@Injectable()
export class AttendanceRepository {
  private state: AttendanceState = {
    devices: [
      {
        id: 'device-001',
        campusId: 'campus-001',
        serialNo: 'BEACON-001',
        deviceType: 'beacon',
        status: 'bound',
        note: '前台签到设备',
        createdAt: '2026-03-24T08:00:00+08:00',
        updatedAt: '2026-03-24T08:00:00+08:00',
      },
    ],
    bindings: [
      {
        id: 'binding-001',
        studentId: 'student-001',
        deviceId: 'device-001',
        status: 'active',
        boundAt: '2026-03-24T08:10:00+08:00',
        unboundAt: null,
        createdBy: 'user-admin-001',
        createdAt: '2026-03-24T08:10:00+08:00',
        updatedAt: '2026-03-24T08:10:00+08:00',
      },
    ],
    events: [
      {
        id: 'attendance-event-001',
        studentId: 'student-001',
        campusId: 'campus-001',
        deviceId: 'device-001',
        eventType: 'checkin',
        eventTime: '2026-03-24T16:00:00+08:00',
        operatorUserId: null,
        remark: '样例签到',
        dedupeKey: 'device-001|2026-03-24T08:00:00.000Z|checkin',
        createdAt: '2026-03-24T16:00:01+08:00',
      },
    ],
    sessions: [
      {
        id: 'hw-session-001',
        studentId: 'student-001',
        termId: 'term-2026-spring',
        campusId: 'campus-001',
        subject: 'math',
        deviceId: 'device-001',
        sourceType: 'device',
        startTime: '2026-03-24T19:00:00+08:00',
        endTime: '2026-03-24T19:45:00+08:00',
        durationMinutes: 45,
        createdBy: 'user-teacher-001',
        remark: '样例作业时长',
        createdAt: '2026-03-24T19:45:00+08:00',
      },
    ],
    dailyStats: [
      {
        id: 'hw-stat-001',
        studentId: 'student-001',
        statDate: '2026-03-24',
        subject: 'math',
        totalMinutes: 45,
        sessionCount: 1,
        generatedAt: '2026-03-24T19:45:00+08:00',
      },
    ],
  };

  listDevices() { return [...this.state.devices]; }
  listBindings() { return [...this.state.bindings]; }
  listEvents() { return [...this.state.events]; }
  listSessions() { return [...this.state.sessions]; }
  listDailyStats() { return [...this.state.dailyStats]; }

  getDeviceOrThrow(deviceId: string) {
    const device = this.state.devices.find((item) => item.id === deviceId);
    if (!device) throw new NotFoundException(`device ${deviceId} not found`);
    return device;
  }

  getBindingOrThrow(bindingId: string) {
    const binding = this.state.bindings.find((item) => item.id === bindingId);
    if (!binding) throw new NotFoundException(`binding ${bindingId} not found`);
    return binding;
  }

  createDevice(input: Omit<AttendanceDevice, 'id' | 'createdAt' | 'updatedAt'>) {
    this.ensureUnique('serialNo', this.state.devices.some((item) => item.serialNo === input.serialNo));
    const now = new Date().toISOString();
    const device: AttendanceDevice = {
      ...input,
      id: `device-${String(this.state.devices.length + 1).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
    };
    this.state.devices.unshift(device);
    return device;
  }

  createBinding(input: Omit<StudentDeviceBinding, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const binding: StudentDeviceBinding = {
      ...input,
      id: `binding-${String(this.state.bindings.length + 1).padStart(3, '0')}`,
      createdAt: now,
      updatedAt: now,
    };
    this.state.bindings.unshift(binding);
    return binding;
  }

  updateBinding(bindingId: string, patch: Partial<StudentDeviceBinding>) {
    const binding = this.getBindingOrThrow(bindingId);
    Object.assign(binding, patch, { updatedAt: new Date().toISOString() });
    return binding;
  }

  createEvent(input: Omit<AttendanceEvent, 'id' | 'createdAt'>) {
    const event: AttendanceEvent = {
      ...input,
      id: `attendance-event-${String(this.state.events.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    this.state.events.unshift(event);
    return event;
  }

  findEventByDedupeKey(dedupeKey: string) {
    return this.state.events.find((item) => item.dedupeKey === dedupeKey);
  }

  replaceDailyStat(record: Omit<HomeworkTimeDailyStat, 'id' | 'generatedAt'>) {
    const existing = this.state.dailyStats.find(
      (item) => item.studentId === record.studentId && item.statDate === record.statDate && item.subject === record.subject,
    );
    const now = new Date().toISOString();
    if (existing) {
      Object.assign(existing, record, { generatedAt: now });
      return existing;
    }
    const stat: HomeworkTimeDailyStat = {
      ...record,
      id: `hw-stat-${String(this.state.dailyStats.length + 1).padStart(3, '0')}`,
      generatedAt: now,
    };
    this.state.dailyStats.unshift(stat);
    return stat;
  }

  createSession(input: Omit<HomeworkTimeSession, 'id' | 'createdAt'>) {
    const session: HomeworkTimeSession = {
      ...input,
      id: `hw-session-${String(this.state.sessions.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    this.state.sessions.unshift(session);
    return session;
  }

  listActiveBindingsByStudent(studentId: string) {
    return this.state.bindings.filter((item) => item.studentId === studentId && item.status === 'active');
  }

  listActiveBindingsByDevice(deviceId: string) {
    return this.state.bindings.filter((item) => item.deviceId === deviceId && item.status === 'active');
  }

  updateDevice(deviceId: string, patch: Partial<AttendanceDevice>) {
    const device = this.getDeviceOrThrow(deviceId);
    Object.assign(device, patch, { updatedAt: new Date().toISOString() });
    return device;
  }

  runInTransaction<T>(runner: () => T): T {
    const snapshot: AttendanceState = JSON.parse(JSON.stringify(this.state));
    try {
      return runner();
    } catch (error) {
      this.state = snapshot;
      throw error;
    }
  }

  private ensureUnique(field: string, exists: boolean) {
    if (exists) {
      throw new ConflictException(`${field} already exists`);
    }
  }
}
