import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { SettingsController } from './controller/settings.controller';
import { SettingsRepository } from './repository/settings.repository';
import { SettingsService } from './service/settings.service';

@Module({
  imports: [AuthModule],
  controllers: [SettingsController],
  providers: [ApiAuthGuard, PermissionGuard, SettingsRepository, SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
