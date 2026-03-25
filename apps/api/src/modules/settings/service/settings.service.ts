import { Injectable } from '@nestjs/common';
import { buildPagedResult } from '../../../shared/api-response';
import { UsersRepository } from '../../users/repository/users.repository';
import { SettingsRepository } from '../repository/settings.repository';

export const ACCESS_ROLE_DICT_TYPE = 'access_role';
export const ACCESS_PERMISSION_DICT_TYPE = 'access_permission';

@Injectable()
export class SettingsService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async listCampuses() {
    return buildPagedResult(await this.settingsRepository.listCampuses());
  }

  async listTerms(campusId?: string) {
    return buildPagedResult(await this.settingsRepository.listTerms(campusId));
  }

  async listDictionaries(dictType?: string) {
    if (dictType === ACCESS_ROLE_DICT_TYPE) {
      return buildPagedResult(await this.listRoleCatalog());
    }

    if (dictType === ACCESS_PERMISSION_DICT_TYPE) {
      return buildPagedResult(await this.listPermissionCatalog());
    }

    return buildPagedResult(await this.settingsRepository.listDictionaries(dictType));
  }

  private async listRoleCatalog() {
    const roles = await this.usersRepository.listRoles();

    return [...roles]
      .sort((left, right) => left.code.localeCompare(right.code))
      .map((role) => ({
        id: role.id,
        dictType: ACCESS_ROLE_DICT_TYPE,
        code: role.code,
        label: role.name,
        value: role.scopeLevel,
        scopeLevel: role.scopeLevel,
        status: role.status,
        permissionCount: role.permissionIds.length,
      }));
  }

  private async listPermissionCatalog() {
    const permissions = await this.usersRepository.listPermissions();

    return [...permissions]
      .sort((left, right) => left.code.localeCompare(right.code))
      .map((permission) => ({
        id: permission.id,
        dictType: ACCESS_PERMISSION_DICT_TYPE,
        code: permission.code,
        label: permission.name,
        value: permission.module,
        module: permission.module,
        action: permission.action,
      }));
  }
}
