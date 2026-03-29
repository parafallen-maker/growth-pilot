import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiHttpExceptionFilter } from './common/http-exception.filter';
import { applySecurityHeaders, createCorsOriginResolver, requireJwtSecret } from './common/security';
import { ZodValidationPipe } from './common/validation';
import { MAX_UPLOAD_REQUEST_BYTES } from './modules/files/service/files.service';
import { gzipCompressionMiddleware } from './observability/gzip.middleware';
import { requestContextMiddleware } from './observability/request-context.middleware';
import { structuredLogger } from './observability/structured-logger';

const express = require('express') as {
  json: (options: { limit: number }) => unknown;
  urlencoded: (options: { extended: boolean; limit: number }) => unknown;
};

async function bootstrap() {
  requireJwtSecret();
  const app = await NestFactory.create(AppModule, { logger: structuredLogger });
  app.enableCors({
    origin: createCorsOriginResolver(),
    credentials: true,
  });
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  app.use(requestContextMiddleware);
  app.use(express.json({ limit: MAX_UPLOAD_REQUEST_BYTES }));
  app.use(express.urlencoded({ extended: true, limit: MAX_UPLOAD_REQUEST_BYTES }));
  app.use(gzipCompressionMiddleware);
  app.use(applySecurityHeaders);
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new ApiHttpExceptionFilter());

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  const host = process.env.HOST || '127.0.0.1';
  await app.listen(port, host);
}

void bootstrap().catch((error) => {
  console.error('[bootstrap] failed to start api', error);
  process.exitCode = 1;
});
