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
  async listDevices(@Query() query: DeviceQueryDto) {
    return ok(await this.attendanceService.listDevices(query));
  }

  @Post('devices')
  @RequirePermission('attendance:devices:manage')
  async createDevice(@Body() payload: CreateDeviceDto) {
    return ok(await this.attendanceService.createDevice(payload));
  }

  @Get('devices/bindings')
  @RequirePermission('attendance:devices:view')
  async listBindings(@Query() query: DeviceBindingQueryDto) {
    return ok(await this.attendanceService.listBindings(query));
  }

  @Post('devices/bindings')
  @RequirePermission('attendance:devices:manage')
  async createBinding(@Body() payload: CreateDeviceBindingDto) {
    return ok(await this.attendanceService.createBinding(payload));
  }

  @Patch('devices/bindings/:bindingId')
  @RequirePermission('attendance:devices:manage')
  async updateBinding(@Param('bindingId') bindingId: string, @Body() payload: UpdateDeviceBindingDto) {
    return ok(await this.attendanceService.updateBinding(bindingId, payload));
  }

  @Get('events')
  @RequirePermission('attendance:board:view')
  async listEvents(@Query() query: AttendanceEventQueryDto) {
    return ok(await this.attendanceService.listEvents(query));
  }

  @Post('events')
  @RequirePermission('attendance:board:manage')
  async createEvent(@Body() payload: CreateAttendanceEventDto, @Headers('idempotency-key') idempotencyKey?: string) {
    return ok(await this.attendanceService.createEvent(payload, idempotencyKey));
  }

  @Get('homework-time/daily-stats')
  @RequirePermission('attendance:homework-time:view')
  async getHomeworkTimeDailyStats(@Query() query: HomeworkTimeDailyStatsQueryDto) {
    return ok(await this.attendanceService.getHomeworkTimeDailyStats(query));
  }
}
