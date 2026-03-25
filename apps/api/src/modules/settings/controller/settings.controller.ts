import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { PermissionGuard } from '../../../common/permission.guard';
import { RequirePermission } from '../../../common/permission.decorator';
import { buildApiResponse } from '../../../shared/api-response';
import { SettingsService } from '../service/settings.service';

@Controller('settings')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('campuses')
  @RequirePermission('settings:view')
  listCampuses() {
    return buildApiResponse(this.settingsService.listCampuses());
  }

  @Get('terms')
  @RequirePermission('settings:view')
  listTerms(@Query('campusId') campusId?: string) {
    return buildApiResponse(this.settingsService.listTerms(campusId));
  }

  @Get('dictionaries')
  @RequirePermission('settings:view')
  listDictionaries(@Query('dictType') dictType?: string) {
    return buildApiResponse(this.settingsService.listDictionaries(dictType));
  }
}
