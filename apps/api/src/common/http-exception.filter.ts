import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { captureExceptionForTracking } from '../observability/error-tracker';
import { getRequestId } from '../observability/request-context';
import { structuredLogger } from '../observability/structured-logger';

@Catch()
export class ApiHttpExceptionFilter implements ExceptionFilter {
  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const request = ctx.getRequest<{ url: string; method: string; requestId?: string; authUser?: { id?: string } }>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const normalized = this.normalize(status, raw, exception);
    const requestId = request.requestId ?? getRequestId();
    const timestamp = new Date().toISOString();

    structuredLogger.logException({
      code: normalized.code,
      message: normalized.message,
      requestId,
      userId: request.authUser?.id ?? null,
      method: request.method,
      path: request.url,
      status,
      details: normalized.details ?? null,
      error: exception instanceof Error
        ? { name: exception.name, message: exception.message, stack: exception.stack }
        : exception,
    });

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      await captureExceptionForTracking(exception, {
        code: normalized.code,
        message: normalized.message,
        requestId,
        path: request.url,
        method: request.method,
        status,
        userId: request.authUser?.id,
      });
    }

    response.status(status).json(this.buildResponseBody(normalized, requestId, timestamp));
  }

  private normalize(status: number, raw: string | object | null, exception: unknown) {
    const payload = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
    const fallbackMessage = typeof raw === 'string'
      ? raw
      : payload.message instanceof Array
        ? payload.message.join('; ')
        : typeof payload.message === 'string'
          ? payload.message
          : exception instanceof Error
            ? exception.message
            : 'internal server error';

    const details = payload.details ?? payload.errors ?? null;
    const explicitCode = typeof payload.code === 'string' ? payload.code : null;
    if (explicitCode) {
      return { code: explicitCode, message: fallbackMessage, details };
    }

    if (status === HttpStatus.UNAUTHORIZED || exception instanceof UnauthorizedException) {
      return { code: 'AUTH_401', message: fallbackMessage || 'unauthorized', details };
    }
    if (status === HttpStatus.FORBIDDEN || exception instanceof ForbiddenException) {
      return { code: 'AUTH_403', message: fallbackMessage || 'forbidden', details };
    }
    if (status === HttpStatus.CONFLICT || exception instanceof ConflictException) {
      return { code: 'FLOW_409', message: fallbackMessage || 'conflict', details };
    }
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      return { code: 'FLOW_429', message: fallbackMessage || 'rate limit exceeded', details };
    }
    if (status === HttpStatus.UNPROCESSABLE_ENTITY || exception instanceof UnprocessableEntityException) {
      return { code: 'DATA_422', message: fallbackMessage || 'unprocessable entity', details };
    }
    if (status === HttpStatus.NOT_FOUND) {
      return { code: 'DATA_404', message: fallbackMessage || 'not found', details };
    }
    return { code: 'SYS_500', message: fallbackMessage || 'internal server error', details };
  }

  private buildResponseBody(
    normalized: { code: string; message: string; details: unknown },
    requestId: string,
    timestamp: string,
  ) {
    return normalized.details == null
      ? {
          code: normalized.code,
          message: normalized.message,
          requestId,
          timestamp,
        }
      : {
          code: normalized.code,
          message: normalized.message,
          requestId,
          timestamp,
          details: normalized.details,
        };
  }
}
