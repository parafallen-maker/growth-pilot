import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { PermissionGuard } from '../../../common/permission.guard';
import { RequirePermission } from '../../../common/permission.decorator';
import { ok } from '../../../common/api-response';
import { AttendanceEventQueryDto } from '../dto/attendance-event-query.dto';
import { CreateAttendanceEventDto } from '../dto/create-attendance-event.dto';
import { CreateDeviceBindingDto } from '../dto/create-device-binding.dto';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { DeviceBindingQueryDto } from '../dto/device-binding-query.dto';
import { DeviceQueryDto } from '../dto/device-query.dto';
import { HomeworkTimeDailyStatsQueryDto } from '../dto/homework-time-daily-stats-query.dto';
import { UpdateDeviceBindingDto } from '../dto/update-device-binding.dto';
import { AttendanceService } from '../service/attendance.service';

@Controller('attendance')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('devices')
  @RequirePermission('attendance:devices:view')
  listDevices(@Query() query: DeviceQueryDto) {
    return ok(this.attendanceService.listDevices(query));
  }

  @Post('devices')
  @RequirePermission('attendance:devices:manage')
  createDevice(@Body() payload: CreateDeviceDto) {
    return ok(this.attendanceService.createDevice(payload));
  }

  @Get('devices/bindings')
  @RequirePermission('attendance:devices:view')
  listBindings(@Query() query: DeviceBindingQueryDto) {
    return ok(this.attendanceService.listBindings(query));
  }

  @Post('devices/bindings')
  @RequirePermission('attendance:devices:manage')
  createBinding(@Body() payload: CreateDeviceBindingDto) {
    return ok(this.attendanceService.createBinding(payload));
  }

  @Patch('devices/bindings/:bindingId')
  @RequirePermission('attendance:devices:manage')
  updateBinding(@Param('bindingId') bindingId: string, @Body() payload: UpdateDeviceBindingDto) {
    return ok(this.attendanceService.updateBinding(bindingId, payload));
  }

  @Get('events')
  @RequirePermission('attendance:board:view')
  listEvents(@Query() query: AttendanceEventQueryDto) {
    return ok(this.attendanceService.listEvents(query));
  }

  @Post('events')
  @RequirePermission('attendance:board:manage')
  createEvent(@Body() payload: CreateAttendanceEventDto, @Headers('idempotency-key') idempotencyKey?: string) {
    return ok(this.attendanceService.createEvent(payload, idempotencyKey));
  }

  @Get('homework-time/daily-stats')
  @RequirePermission('attendance:homework-time:view')
  getHomeworkTimeDailyStats(@Query() query: HomeworkTimeDailyStatsQueryDto) {
    return ok(this.attendanceService.getHomeworkTimeDailyStats(query));
  }
}
