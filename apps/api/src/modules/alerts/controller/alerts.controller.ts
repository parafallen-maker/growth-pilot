import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { PermissionGuard } from '../../../common/permission.guard';
import { RequirePermission } from '../../../common/permission.decorator';
import { ok } from '../../../common/api-response';
import { AlertQueryDto } from '../dto/alert-query.dto';
import { CreateAlertDto } from '../dto/create-alert.dto';
import { UpdateAlertDto } from '../dto/update-alert.dto';
import { AlertsService } from '../service/alerts.service';

@Controller('alerts')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @RequirePermission('alerts:view')
  async list(@Query() query: AlertQueryDto) {
    return ok(await this.alertsService.list(query));
  }

  @Post()
  @RequirePermission('alerts:view')
  async create(@Body() payload: CreateAlertDto) {
    return ok(await this.alertsService.create(payload));
  }

  @Patch(':alertId')
  @RequirePermission('alerts:view')
  async update(@Param('alertId') alertId: string, @Body() payload: UpdateAlertDto) {
    return ok(await this.alertsService.update(alertId, payload));
  }
}
