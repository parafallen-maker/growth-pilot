import { ConflictException, Injectable } from '@nestjs/common';
import type { AttendanceDevice, AttendanceEvent, HomeworkTimeDailyStat, StudentDeviceBinding } from '@growthpilot/schema/index';
import { normalizePage } from '../../../common/base-list-query.dto';
import type { PageResult } from '../../../common/api-response';
import { AttendanceEventQueryDto } from '../dto/attendance-event-query.dto';
import { CreateAttendanceEventDto } from '../dto/create-attendance-event.dto';
import { CreateDeviceBindingDto } from '../dto/create-device-binding.dto';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { DeviceBindingQueryDto } from '../dto/device-binding-query.dto';
import { DeviceQueryDto } from '../dto/device-query.dto';
import { HomeworkTimeDailyStatsQueryDto } from '../dto/homework-time-daily-stats-query.dto';
import { UpdateDeviceBindingDto } from '../dto/update-device-binding.dto';
import { AttendanceRepository } from '../repository/attendance.repository';

@Injectable()
export class AttendanceService {
  constructor(private readonly attendanceRepository: AttendanceRepository) {}

  listDevices(query: DeviceQueryDto): PageResult<AttendanceDevice> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.attendanceRepository.listDevices().filter((item) => {
      if (query.campusId && item.campusId !== query.campusId) return false;
      if (query.status && item.status !== query.status) return false;
      if (query.deviceType && item.deviceType !== query.deviceType) return false;
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        return [item.serialNo, item.deviceType, item.note].filter(Boolean).some((value) => value!.toLowerCase().includes(keyword));
      }
      return true;
    });
    return this.page(filtered, pageNo, pageSize);
  }

  createDevice(payload: CreateDeviceDto) {
    return this.attendanceRepository.createDevice({
      campusId: payload.campusId ?? null,
      serialNo: payload.serialNo,
      deviceType: payload.deviceType ?? 'beacon',
      status: payload.status ?? 'idle',
      note: payload.note,
    });
  }

  listBindings(query: DeviceBindingQueryDto): PageResult<StudentDeviceBinding> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.attendanceRepository.listBindings().filter((item) => {
      if (query.studentId && item.studentId !== query.studentId) return false;
      if (query.deviceId && item.deviceId !== query.deviceId) return false;
      if (query.status && item.status !== query.status) return false;
      return true;
    });
    return this.page(filtered, pageNo, pageSize);
  }

  createBinding(payload: CreateDeviceBindingDto) {
    return this.attendanceRepository.runInTransaction(() => {
      const device = this.attendanceRepository.getDeviceOrThrow(payload.deviceId);
      const targetStatus = payload.status ?? 'active';
      if (targetStatus === 'active') {
        if (this.attendanceRepository.listActiveBindingsByStudent(payload.studentId).length > 0) {
          throw new ConflictException('student already has an active binding');
        }
        if (this.attendanceRepository.listActiveBindingsByDevice(payload.deviceId).length > 0) {
          throw new ConflictException('device already has an active binding');
        }
      }

      const binding = this.attendanceRepository.createBinding({
        studentId: payload.studentId,
        deviceId: payload.deviceId,
        status: targetStatus,
        boundAt: payload.boundAt ?? new Date().toISOString(),
        unboundAt: null,
        createdBy: payload.createdBy ?? null,
      });

      this.attendanceRepository.updateDevice(device.id, { status: binding.status === 'active' ? 'bound' : device.status });
      return binding;
    });
  }

  updateBinding(bindingId: string, payload: UpdateDeviceBindingDto) {
    return this.attendanceRepository.runInTransaction(() => {
      const binding = this.attendanceRepository.getBindingOrThrow(bindingId);
      const nextStatus = payload.status ?? binding.status;
      if (binding.status !== 'active' && nextStatus === 'active') {
        if (this.attendanceRepository.listActiveBindingsByStudent(binding.studentId).some((item) => item.id !== binding.id)) {
          throw new ConflictException('student already has another active binding');
        }
        if (this.attendanceRepository.listActiveBindingsByDevice(binding.deviceId).some((item) => item.id !== binding.id)) {
          throw new ConflictException('device already has another active binding');
        }
      }

      const updated = this.attendanceRepository.updateBinding(bindingId, {
        status: nextStatus,
        unboundAt: nextStatus === 'inactive' ? payload.unboundAt ?? new Date().toISOString() : null,
      });
      this.refreshDeviceStatus(updated.deviceId);
      return updated;
    });
  }

  listEvents(query: AttendanceEventQueryDto): PageResult<AttendanceEvent> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.attendanceRepository.listEvents().filter((item) => {
      if (query.studentId && item.studentId !== query.studentId) return false;
      if (query.campusId && item.campusId !== query.campusId) return false;
      if (query.deviceId && item.deviceId !== query.deviceId) return false;
      if (query.eventType && item.eventType !== query.eventType) return false;
      const eventDate = item.eventTime.slice(0, 10);
      if (query.dateFrom && eventDate < query.dateFrom) return false;
      if (query.dateTo && eventDate > query.dateTo) return false;
      return true;
    });
    return this.page(filtered, pageNo, pageSize);
  }

  createEvent(payload: CreateAttendanceEventDto, idempotencyKey?: string) {
    return this.attendanceRepository.runInTransaction(() => {
      const dedupeKey = this.buildEventDedupeKey(payload.deviceId, payload.eventTime, payload.eventType, idempotencyKey);
      const existing = this.attendanceRepository.findEventByDedupeKey(dedupeKey);
      if (existing) {
        return { ...existing, replayed: true };
      }

      if (payload.deviceId) {
        const activeBinding = this.attendanceRepository.listActiveBindingsByDevice(payload.deviceId)[0];
        if (activeBinding && activeBinding.studentId !== payload.studentId) {
          throw new ConflictException('device is actively bound to another student');
        }
      }

      return this.attendanceRepository.createEvent({
        studentId: payload.studentId,
        campusId: payload.campusId,
        deviceId: payload.deviceId ?? null,
        eventType: payload.eventType,
        eventTime: payload.eventTime,
        operatorUserId: payload.operatorUserId ?? null,
        remark: payload.remark,
        dedupeKey,
      });
    });
  }

  getHomeworkTimeDailyStats(query: HomeworkTimeDailyStatsQueryDto): PageResult<HomeworkTimeDailyStat> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.attendanceRepository.listDailyStats().filter((item) => {
      if (query.studentId && item.studentId !== query.studentId) return false;
      if (query.subject && item.subject !== query.subject) return false;
      if (query.dateFrom && item.statDate < query.dateFrom) return false;
      if (query.dateTo && item.statDate > query.dateTo) return false;
      return true;
    });
    return this.page(filtered, pageNo, pageSize);
  }

  createHomeworkTimeSession(payload: {
    studentId: string;
    termId?: string;
    campusId?: string;
    subject: string;
    deviceId?: string;
    sourceType?: 'manual' | 'device';
    startTime: string;
    endTime: string;
    createdBy?: string;
    remark?: string;
  }) {
    return this.attendanceRepository.runInTransaction(() => {
      const durationMinutes = Math.max(0, Math.round((new Date(payload.endTime).getTime() - new Date(payload.startTime).getTime()) / 60000));
      if (durationMinutes <= 0) {
        throw new ConflictException('homework time session duration must be > 0');
      }
      const session = this.attendanceRepository.createSession({
        studentId: payload.studentId,
        termId: payload.termId ?? null,
        campusId: payload.campusId ?? null,
        subject: payload.subject,
        deviceId: payload.deviceId ?? null,
        sourceType: payload.sourceType ?? 'manual',
        startTime: payload.startTime,
        endTime: payload.endTime,
        durationMinutes,
        createdBy: payload.createdBy ?? null,
        remark: payload.remark,
      });
      this.regenerateDailyStats(payload.studentId, session.subject, session.startTime.slice(0, 10));
      return session;
    });
  }

  regenerateDailyStats(studentId: string, subject?: string, statDate?: string) {
    const sessions = this.attendanceRepository.listSessions().filter((item) => {
      if (item.studentId !== studentId) return false;
      if (subject && item.subject !== subject) return false;
      if (statDate && item.startTime.slice(0, 10) !== statDate) return false;
      return true;
    });

    const buckets = new Map<string, { studentId: string; statDate: string; subject: string; totalMinutes: number; sessionCount: number }>();
    for (const session of sessions) {
      const key = `${session.studentId}|${session.startTime.slice(0, 10)}|${session.subject}`;
      const bucket = buckets.get(key) ?? {
        studentId: session.studentId,
        statDate: session.startTime.slice(0, 10),
        subject: session.subject,
        totalMinutes: 0,
        sessionCount: 0,
      };
      bucket.totalMinutes += session.durationMinutes;
      bucket.sessionCount += 1;
      buckets.set(key, bucket);
    }

    return Array.from(buckets.values()).map((item) => this.attendanceRepository.replaceDailyStat(item));
  }

  private refreshDeviceStatus(deviceId: string) {
    const active = this.attendanceRepository.listActiveBindingsByDevice(deviceId);
    this.attendanceRepository.updateDevice(deviceId, { status: active.length ? 'bound' : 'idle' });
  }

  private buildEventDedupeKey(deviceId: string | undefined, eventTime: string, eventType: string, idempotencyKey?: string) {
    if (idempotencyKey) return `idempotency:${idempotencyKey}`;
    return `${deviceId ?? 'manual'}|${new Date(eventTime).toISOString()}|${eventType}`;
  }

  private page<T>(list: T[], pageNo: number, pageSize: number): PageResult<T> {
    const start = (pageNo - 1) * pageSize;
    return {
      list: list.slice(start, start + pageSize),
      page: { pageNo, pageSize, total: list.length },
    };
  }
}
