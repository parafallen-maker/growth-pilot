import { Module } from '@nestjs/common';
import { SettingsController } from './controller/settings.controller';
import { SettingsRepository } from './repository/settings.repository';
import { SettingsService } from './service/settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsRepository, SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
