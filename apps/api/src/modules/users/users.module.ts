import { forwardRef, Module } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './controller/users.controller';
import { UsersRepository } from './repository/users.repository';
import { UsersService } from './service/users.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, ApiAuthGuard, PermissionGuard],
  exports: [UsersService],
})
export class UsersModule {}
