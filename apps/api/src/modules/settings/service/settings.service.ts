import { Injectable } from '@nestjs/common';
import { buildPagedResult } from '../../../shared/api-response';
import { SettingsRepository } from '../repository/settings.repository';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  listCampuses() {
    return buildPagedResult(this.settingsRepository.listCampuses());
  }

  listTerms(campusId?: string) {
    return buildPagedResult(this.settingsRepository.listTerms(campusId));
  }

  listDictionaries(dictType?: string) {
    return buildPagedResult(this.settingsRepository.listDictionaries(dictType));
  }
}
