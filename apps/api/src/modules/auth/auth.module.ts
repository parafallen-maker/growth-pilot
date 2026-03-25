import { forwardRef, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './controller/auth.controller';
import { DefaultAuthSessionRepository } from './repository/auth-session.repository';
import { AuthRateLimitService } from './service/auth-rate-limit.service';
import { AuthSessionCacheService } from './service/auth-session-cache.service';
import { AuthService } from './service/auth.service';
import { RedisKvService } from './service/redis-kv.service';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [RedisKvService, AuthRateLimitService, AuthSessionCacheService, DefaultAuthSessionRepository, AuthService],
  exports: [RedisKvService, AuthRateLimitService, AuthSessionCacheService, DefaultAuthSessionRepository, AuthService],
})
export class AuthModule {}
