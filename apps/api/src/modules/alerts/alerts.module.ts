import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { AlertsController } from './controller/alerts.controller';
import { AlertsRepository } from './repository/alerts.repository';
import { AlertsService } from './service/alerts.service';

@Module({
  imports: [AuthModule],
  controllers: [AlertsController],
  providers: [ApiAuthGuard, PermissionGuard, AlertsRepository, AlertsService],
  exports: [AlertsRepository, AlertsService],
})
export class AlertsModule {}
