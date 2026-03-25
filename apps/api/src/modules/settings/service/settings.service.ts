import { Injectable } from '@nestjs/common';
import { buildPagedResult } from '../../../shared/api-response';
import { SettingsRepository } from '../repository/settings.repository';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async listCampuses() {
    return buildPagedResult(await this.settingsRepository.listCampuses());
  }

  async listTerms(campusId?: string) {
    return buildPagedResult(await this.settingsRepository.listTerms(campusId));
  }

  async listDictionaries(dictType?: string) {
    return buildPagedResult(await this.settingsRepository.listDictionaries(dictType));
  }
}
