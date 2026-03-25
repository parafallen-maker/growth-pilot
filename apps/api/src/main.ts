import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiHttpExceptionFilter } from './common/http-exception.filter';
import { applySecurityHeaders, createCorsOriginResolver, requireJwtSecret } from './common/security';
import { ZodValidationPipe } from './common/validation';

async function bootstrap() {
  requireJwtSecret();
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: createCorsOriginResolver(),
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.use(applySecurityHeaders);
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new ApiHttpExceptionFilter());
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}

void bootstrap();
