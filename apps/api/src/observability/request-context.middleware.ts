import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from './request-context';
import { structuredLogger } from './structured-logger';

type NextFunction = () => void;

type AuthenticatedRequest = {
  header: (name: string) => string | undefined;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  originalUrl?: string;
  url?: string;
  authUser?: {
    id?: string;
  };
  requestId?: string;
};

type ResponseLike = {
  on: (event: 'finish', listener: () => void) => void;
  setHeader: (name: string, value: string) => void;
  statusCode: number;
};

export function requestContextMiddleware(request: AuthenticatedRequest, response: ResponseLike, next: NextFunction) {
  const typedRequest = request;
  const requestIdHeader = request.header('x-request-id');
  const requestId = requestIdHeader?.trim() || randomUUID();
  const startedAt = process.hrtime.bigint();

  typedRequest.requestId = requestId;
  response.setHeader('x-request-id', requestId);

  runWithRequestContext({ requestId }, () => {
    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      structuredLogger.logRequest({
        requestId,
        userId: typedRequest.authUser?.id ?? null,
        method: request.method,
        path: request.originalUrl || request.url,
        status: response.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      });
    });

    next();
  });
}
