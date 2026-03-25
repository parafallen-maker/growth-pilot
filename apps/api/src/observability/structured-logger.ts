import { ConsoleLogger, LoggerService } from '@nestjs/common';

export interface StructuredLogFields {
  [key: string]: unknown;
}

function sanitizeError(error: unknown) {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

export class StructuredLogger extends ConsoleLogger implements LoggerService {
  constructor() {
    super('GrowthPilotApi', { json: true });
  }

  log(message: unknown, ...optionalParams: unknown[]) {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    this.write('verbose', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]) {
    this.write('fatal', message, optionalParams);
  }

  logRequest(fields: StructuredLogFields) {
    this.write('info', 'request_completed', [fields]);
  }

  logException(fields: StructuredLogFields) {
    this.write('error', 'request_failed', [fields]);
  }

  private write(level: string, message: unknown, optionalParams: unknown[]) {
    const record: Record<string, unknown> = {
      level,
      timestamp: new Date().toISOString(),
      message: typeof message === 'string' ? message : 'structured_log',
    };

    if (typeof message === 'object' && message !== null) {
      record.payload = message;
    }

    for (const param of optionalParams) {
      if (param instanceof Error) {
        record.error = sanitizeError(param);
        continue;
      }

      if (typeof param === 'string') {
        record.context = param;
        continue;
      }

      if (typeof param === 'object' && param !== null) {
        Object.assign(record, param as StructuredLogFields);
      }
    }

    const sink = level === 'error' || level === 'fatal' ? process.stderr : process.stdout;
    sink.write(`${JSON.stringify(record)}\n`);
  }
}

export const structuredLogger = new StructuredLogger();
