import { Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { TasksController } from './controller/tasks.controller';
import { TasksRepository } from './repository/tasks.repository';
import { TasksService } from './service/tasks.service';

@Module({
  imports: [AuthModule],
  controllers: [TasksController],
  providers: [ApiAuthGuard, PermissionGuard, TasksRepository, TasksService],
  exports: [TasksRepository, TasksService],
})
export class TasksModule {}
