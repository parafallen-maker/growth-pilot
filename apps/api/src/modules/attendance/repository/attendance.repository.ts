import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AttendanceDevice,
  AttendanceEvent,
  HomeworkTimeDailyStat,
  HomeworkTimeSession,
  StudentDeviceBinding,
} from '@growthpilot/schema/index';
import { PersistentJsonStore } from '../../../common/persistent-json.store';

interface AttendanceState {
  devices: AttendanceDevice[];
  bindings: StudentDeviceBinding[];
  events: AttendanceEvent[];
  sessions: HomeworkTimeSession[];
  dailyStats: HomeworkTimeDailyStat[];
}

@Injectable()
export class AttendanceRepository {
  private readonly store: PersistentJsonStore<AttendanceState>;

  constructor(filePath = '.data/attendance.json') {
    this.store = new PersistentJsonStore<AttendanceState>(filePath, () => ({
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
  }));
  }

  private get state() { return this.store.get(); }

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
    this.store.update((state) => {
      state.devices.unshift(device);
    });
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
    this.store.update((state) => {
      state.bindings.unshift(binding);
    });
    return binding;
  }

  updateBinding(bindingId: string, patch: Partial<StudentDeviceBinding>) {
    let updated!: StudentDeviceBinding;
    this.store.update((state) => {
      const binding = state.bindings.find((item) => item.id === bindingId);
      if (!binding) throw new NotFoundException(`binding ${bindingId} not found`);
      Object.assign(binding, patch, { updatedAt: new Date().toISOString() });
      updated = binding;
    });
    return updated;
  }

  createEvent(input: Omit<AttendanceEvent, 'id' | 'createdAt'>) {
    const event: AttendanceEvent = {
      ...input,
      id: `attendance-event-${String(this.state.events.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    this.store.update((state) => {
      state.events.unshift(event);
    });
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
    let updated: HomeworkTimeDailyStat | undefined;
    if (existing) {
      this.store.update((state) => {
        const target = state.dailyStats.find(
          (item) => item.studentId === record.studentId && item.statDate === record.statDate && item.subject === record.subject,
        );
        if (!target) return;
        Object.assign(target, record, { generatedAt: now });
        updated = target;
      });
      return updated!;
    }
    const stat: HomeworkTimeDailyStat = {
      ...record,
      id: `hw-stat-${String(this.state.dailyStats.length + 1).padStart(3, '0')}`,
      generatedAt: now,
    };
    this.store.update((state) => {
      state.dailyStats.unshift(stat);
    });
    return stat;
  }

  createSession(input: Omit<HomeworkTimeSession, 'id' | 'createdAt'>) {
    const session: HomeworkTimeSession = {
      ...input,
      id: `hw-session-${String(this.state.sessions.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    this.store.update((state) => {
      state.sessions.unshift(session);
    });
    return session;
  }

  listActiveBindingsByStudent(studentId: string) {
    return this.state.bindings.filter((item) => item.studentId === studentId && item.status === 'active');
  }

  listActiveBindingsByDevice(deviceId: string) {
    return this.state.bindings.filter((item) => item.deviceId === deviceId && item.status === 'active');
  }

  findOverlappingBinding(input: { studentId: string; deviceId: string; boundAt: string; unboundAt?: string | null; excludeBindingId?: string }) {
    const nextStart = new Date(input.boundAt).getTime();
    const nextEnd = input.unboundAt ? new Date(input.unboundAt).getTime() : Number.POSITIVE_INFINITY;
    return this.state.bindings.find((item) => {
      if (input.excludeBindingId && item.id === input.excludeBindingId) return false;
      if (item.studentId !== input.studentId && item.deviceId !== input.deviceId) return false;
      const currentStart = new Date(item.boundAt).getTime();
      const currentEnd = item.unboundAt ? new Date(item.unboundAt).getTime() : Number.POSITIVE_INFINITY;
      return currentStart <= nextEnd && nextStart <= currentEnd;
    });
  }

  findOverlappingSession(input: { studentId: string; startTime: string; endTime: string; subject?: string; deviceId?: string | null }) {
    const nextStart = new Date(input.startTime).getTime();
    const nextEnd = new Date(input.endTime).getTime();
    return this.state.sessions.find((item) => {
      if (item.studentId !== input.studentId) return false;
      if (input.subject && item.subject !== input.subject) return false;
      if (input.deviceId && item.deviceId && item.deviceId !== input.deviceId) return false;
      const currentStart = new Date(item.startTime).getTime();
      const currentEnd = new Date(item.endTime).getTime();
      return currentStart < nextEnd && nextStart < currentEnd;
    });
  }

  updateDevice(deviceId: string, patch: Partial<AttendanceDevice>) {
    let updated!: AttendanceDevice;
    this.store.update((state) => {
      const device = state.devices.find((item) => item.id === deviceId);
      if (!device) throw new NotFoundException(`device ${deviceId} not found`);
      Object.assign(device, patch, { updatedAt: new Date().toISOString() });
      updated = device;
    });
    return updated;
  }

  runInTransaction<T>(runner: () => T): T {
    const snapshot = this.store.snapshot();
    try {
      return runner();
    } catch (error) {
      this.store.replace(snapshot);
      throw error;
    }
  }

  private ensureUnique(field: string, exists: boolean) {
    if (exists) {
      throw new ConflictException({ code: 'DATA_409', message: `${field} already exists` });
    }
  }
}
