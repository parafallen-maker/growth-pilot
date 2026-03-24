import { Injectable } from '@nestjs/common';
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
      return true;
    });
    return this.paginate(filtered, pageNo, pageSize);
  }

  createDevice(payload: CreateDeviceDto) {
    return this.attendanceRepository.createDevice({
      campusId: payload.campusId,
      serialNo: payload.serialNo,
      deviceType: payload.deviceType ?? 'manual',
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
    return this.paginate(filtered, pageNo, pageSize);
  }

  createBinding(payload: CreateDeviceBindingDto) {
    return this.attendanceRepository.createBinding({
      studentId: payload.studentId,
      deviceId: payload.deviceId,
      status: payload.status ?? 'active',
      boundAt: payload.boundAt ?? new Date().toISOString(),
      unboundAt: null,
      createdBy: payload.createdBy,
    });
  }

  updateBinding(bindingId: string, payload: UpdateDeviceBindingDto) {
    return this.attendanceRepository.updateBinding(bindingId, payload);
  }

  listEvents(query: AttendanceEventQueryDto): PageResult<AttendanceEvent> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.attendanceRepository.listEvents().filter((item) => {
      if (query.studentId && item.studentId !== query.studentId) return false;
      if (query.campusId && item.campusId !== query.campusId) return false;
      if (query.eventType && item.eventType !== query.eventType) return false;
      return true;
    });
    return this.paginate(filtered, pageNo, pageSize);
  }

  createEvent(payload: CreateAttendanceEventDto) {
    const dedupeKey = `${payload.deviceId ?? 'manual'}|${new Date(payload.eventTime).toISOString()}|${payload.eventType}`;
    return this.attendanceRepository.findEventByDedupeKey(dedupeKey) ?? this.attendanceRepository.createEvent({
      studentId: payload.studentId,
      campusId: payload.campusId,
      deviceId: payload.deviceId,
      eventType: payload.eventType,
      eventTime: payload.eventTime,
      operatorUserId: payload.operatorUserId,
      remark: payload.remark,
      dedupeKey,
    });
  }

  listDailyStats(query: HomeworkTimeDailyStatsQueryDto): PageResult<HomeworkTimeDailyStat> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.attendanceRepository.listDailyStats().filter((item) => {
      if (query.studentId && item.studentId !== query.studentId) return false;
      if (query.subject && item.subject !== query.subject) return false;
      return true;
    });
    return this.paginate(filtered, pageNo, pageSize);
  }

  private paginate<T>(items: T[], pageNo: number, pageSize: number): PageResult<T> {
    const start = (pageNo - 1) * pageSize;
    return { list: items.slice(start, start + pageSize), page: { pageNo, pageSize, total: items.length } };
  }
}
