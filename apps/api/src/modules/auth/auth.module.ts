import { forwardRef, Module } from '@nestjs/common';
import { PasswordService } from '../../common/security';
import { UsersModule } from '../users/users.module';
import { AuthController } from './controller/auth.controller';
import { DefaultAuthSessionRepository } from './repository/auth-session.repository';
import { AuthService } from './service/auth.service';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [DefaultAuthSessionRepository, AuthService, PasswordService],
  exports: [DefaultAuthSessionRepository, AuthService],
})
export class AuthModule {}
