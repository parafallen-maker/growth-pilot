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

@Catch()
export class ApiHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const request = ctx.getRequest<{ url: string; method: string }>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const normalized = this.normalize(status, raw, exception);

    response.status(status).json({
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
      },
      meta: {
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      },
    });
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
}
