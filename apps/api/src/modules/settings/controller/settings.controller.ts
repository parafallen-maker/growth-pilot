import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../../common/auth.guard';
import { PermissionGuard } from '../../../common/permission.guard';
import { RequirePermission } from '../../../common/permission.decorator';
import { buildApiResponse } from '../../../shared/api-response';
import { CreateDictionaryDto, UpdateDictionaryDto } from '../dto/dictionary.dto';
import { DictionariesQueryDto, TermsQueryDto } from '../dto/settings-query.dto';
import { SettingsService } from '../service/settings.service';

@Controller('settings')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('campuses')
  @RequirePermission('settings:view')
  async listCampuses() {
    return buildApiResponse(await this.settingsService.listCampuses());
  }

  @Get('terms')
  @RequirePermission('settings:view')
  async listTerms(@Query() query: TermsQueryDto = {}) {
    return buildApiResponse(await this.settingsService.listTerms(query.campusId));
  }

  @Get('dictionaries')
  @RequirePermission('settings:view')
  async listDictionaries(@Query() query: DictionariesQueryDto = {}) {
    return buildApiResponse(await this.settingsService.listDictionaries(query.dictType));
  }

  @Post('dictionaries')
  @RequirePermission('settings:manage')
  async createDictionary(@Body() payload: CreateDictionaryDto) {
    return buildApiResponse(await this.settingsService.createDictionary(payload));
  }

  @Put('dictionaries')
  @RequirePermission('settings:manage')
  async updateDictionary(@Body() payload: UpdateDictionaryDto) {
    return buildApiResponse(await this.settingsService.updateDictionary(payload.code, payload));
  }

  @Delete('dictionaries')
  @RequirePermission('settings:manage')
  async deleteDictionary(@Query('dictType') dictType: string) {
    return buildApiResponse(await this.settingsService.deleteDictionary(dictType));
  }
}
