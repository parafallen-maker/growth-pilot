import { Controller, Get, Query } from '@nestjs/common';
import { buildApiResponse } from '../../../shared/api-response';
import { SettingsService } from '../service/settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('campuses')
  listCampuses() {
    return buildApiResponse(this.settingsService.listCampuses());
  }

  @Get('terms')
  listTerms(@Query('campusId') campusId?: string) {
    return buildApiResponse(this.settingsService.listTerms(campusId));
  }

  @Get('dictionaries')
  listDictionaries(@Query('dictType') dictType?: string) {
    return buildApiResponse(this.settingsService.listDictionaries(dictType));
  }
}
