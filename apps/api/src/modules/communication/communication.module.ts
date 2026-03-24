import { Module } from '@nestjs/common';
import { CommunicationController } from './controller/communication.controller';
import { CommunicationRepository } from './repository/communication.repository';
import { CommunicationService } from './service/communication.service';

@Module({
  controllers: [CommunicationController],
  providers: [CommunicationRepository, CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
