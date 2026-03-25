import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { CommunicationController } from './controller/communication.controller';
import { CommunicationRepository } from './repository/communication.repository';
import { CommunicationService } from './service/communication.service';

@Module({
  imports: [AuthModule],
  controllers: [CommunicationController],
  providers: [ApiAuthGuard, PermissionGuard, CommunicationRepository, CommunicationService],
  exports: [CommunicationService, CommunicationRepository],
})
export class CommunicationModule {}
