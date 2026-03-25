import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const DEFAULT_DEV_SECRET = 'growthpilot-dev-secret';
const TEST_JWT_SECRET = 'growthpilot-test-secret-with-32-chars!';
const SENSITIVE_RESPONSE_FIELDS = new Set(['password', 'passwordHash', 'accessToken', 'refreshToken', 'secret']);
const SENSITIVE_LOG_FIELDS = new Set(['password', 'passwordHash', 'accessToken', 'refreshToken', 'authorization', 'secret']);

export interface RateLimitPolicy {
  limit: number;
  ttlMs: number;
  keyPrefix?: string;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_METADATA_KEY = 'security:rate_limit';
const RESPONSE_SENSITIVE_FIELDS_METADATA_KEY = 'security:response_sensitive_fields';

export function requireJwtSecret() {
  const secret = process.env.JWT_SECRET ?? (process.env.NODE_ENV === 'test' ? TEST_JWT_SECRET : undefined);
  if (!secret) {
    throw new Error('JWT_SECRET is required and must be set in the environment');
  }
  if (secret === DEFAULT_DEV_SECRET) {
    throw new Error('JWT_SECRET must not use the default development secret');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  return secret;
}

export function getAllowedCorsOrigins() {
  const declared = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3100',
    'http://localhost:3101',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3100',
    'http://127.0.0.1:3101',
  ];

  return [...new Set(process.env.NODE_ENV === 'production' ? declared : [...declared, ...devOrigins])];
}

export function createCorsOriginResolver() {
  const allowed = new Set(getAllowedCorsOrigins());
  return (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowed.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`origin ${origin} is not allowed by CORS`));
  };
}

export function applySecurityHeaders(request: { headers?: Record<string, string | string[] | undefined>; secure?: boolean }, response: { setHeader: (name: string, value: string) => void }, next: () => void) {
  const connectSources = ["'self'", ...getAllowedCorsOrigins()];
  response.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${connectSources.join(' ')}`,
  ].join('; '));
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-DNS-Prefetch-Control', 'off');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  const forwardedProto = request.headers?.['x-forwarded-proto'];
  const isHttps = request.secure || forwardedProto === 'https' || forwardedProto === 'https,https';
  if (process.env.NODE_ENV === 'production' && isHttps) {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

export function exposeSensitiveResponseFields(...fields: string[]) {
  return SetMetadata(RESPONSE_SENSITIVE_FIELDS_METADATA_KEY, fields);
}

export function rateLimit(policy: RateLimitPolicy) {
  return SetMetadata(RATE_LIMIT_METADATA_KEY, policy);
}

export function redactSensitiveForLogs<T>(value: T): T {
  return redactSensitiveObject(value, SENSITIVE_LOG_FIELDS, true);
}

function redactSensitiveObject<T>(value: T, sensitiveFields: Set<string>, mask: boolean, allowedFields?: Set<string>): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveObject(item, sensitiveFields, mask, allowedFields)) as T;
  }
  if (typeof value !== 'object') {
    return value;
  }

  const nextValue: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (sensitiveFields.has(key) && !(allowedFields?.has(key))) {
      if (mask) {
        nextValue[key] = '[redacted]';
      }
      continue;
    }

    nextValue[key] = redactSensitiveObject(nestedValue, sensitiveFields, mask, allowedFields);
  }

  return nextValue as T;
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('base64url');
}

export function secureCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (process.env.AUTH_COOKIE_SAME_SITE as 'lax' | 'strict' | 'none' | undefined) ?? (isProduction ? 'none' : 'lax'),
    domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
    path: '/',
  };
}

@Injectable()
export class PasswordService {
  private readonly keyLength = 64;
  private readonly cost = 16384;
  private readonly blockSize = 8;
  private readonly parallelization = 1;

  hash(plainText: string) {
    const salt = randomBytes(16);
    const derivedKey = scryptSync(plainText, salt, this.keyLength, {
      N: this.cost,
      r: this.blockSize,
      p: this.parallelization,
    });
    return `scrypt$${this.cost}$${this.blockSize}$${this.parallelization}$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
  }

  verify(plainText: string, storedHash: string) {
    const [algorithm, cost, blockSize, parallelization, salt, expectedHash] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !cost || !blockSize || !parallelization || !salt || !expectedHash) {
      return false;
    }

    const actualHash = scryptSync(plainText, Buffer.from(salt, 'base64url'), Buffer.from(expectedHash, 'base64url').length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization),
    }).toString('base64url');

    return secureCompare(actualHash, expectedHash);
  }
}

@Injectable()
export class SensitiveDataInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const allowedFields = new Set(
      this.reflector.getAllAndOverride<string[]>(RESPONSE_SENSITIVE_FIELDS_METADATA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [],
    );

    return next.handle().pipe(
      map((value) => redactSensitiveObject(value, SENSITIVE_RESPONSE_FIELDS, false, allowedFields)),
    );
  }
}

@Injectable()
export class InMemoryRateLimitGuard {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly defaultPolicy: RateLimitPolicy = { limit: 60, ttlMs: 60_000, keyPrefix: 'global' };

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') {
      return true;
    }

    const policy = this.reflector.getAllAndOverride<RateLimitPolicy>(RATE_LIMIT_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? this.defaultPolicy;

    const request = context.switchToHttp().getRequest<{
      ip?: string;
      path?: string;
      headers?: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
    }>();
    const response = context.switchToHttp().getResponse<{ setHeader: (name: string, value: string) => void }>();
    const now = Date.now();
    const clientKey = this.getClientKey(request);
    const bucketKey = `${policy.keyPrefix ?? 'global'}:${clientKey}`;
    const existing = this.buckets.get(bucketKey);
    const bucket = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + policy.ttlMs }
      : existing;

    bucket.count += 1;
    this.buckets.set(bucketKey, bucket);
    this.compactBuckets(now);

    response.setHeader('X-RateLimit-Limit', String(policy.limit));
    response.setHeader('X-RateLimit-Remaining', String(Math.max(policy.limit - bucket.count, 0)));
    response.setHeader('X-RateLimit-Reset', new Date(bucket.resetAt).toISOString());

    if (bucket.count > policy.limit) {
      throw new HttpException({
        code: 'FLOW_429',
        message: 'rate limit exceeded',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private getClientKey(request: { ip?: string; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }) {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
      return forwardedFor.split(',')[0]!.trim();
    }
    if (Array.isArray(forwardedFor) && forwardedFor[0]?.trim()) {
      return forwardedFor[0].split(',')[0]!.trim();
    }
    return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
  }

  private compactBuckets(now: number) {
    if (this.buckets.size < 1024) {
      return;
    }
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
