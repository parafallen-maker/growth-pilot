export type ApiEnvelope<T> = {
  code: string;
  message: string;
  data: T;
  traceId: string;
};

export type PageMeta = {
  pageNo: number;
  pageSize: number;
  total: number;
};

export type PageResult<T> = {
  list: T[];
  page: PageMeta;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  traceId?: string;

  constructor(message: string, status: number, code?: string, traceId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.traceId = traceId;
  }
}

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth-constants';
const DEFAULT_API_BASE_URL = typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:3001/api/v1';

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export function getApiBaseUrl() {
  return process.env.GROWTHPILOT_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export type ApiAuth = {
  accessToken?: string | null;
  refreshToken?: string | null;
};

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: ApiAuth;
  retryOn401?: boolean;
  onAuthUpdate?: (auth: Required<ApiAuth>) => Promise<void> | void;
  onUnauthorized?: () => Promise<void> | void;
};

async function parseResponse<T>(response: Response, path: string): Promise<T> {
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Partial<ApiEnvelope<T>>) : null;

  if (!response.ok) {
    const fallbackMessage = response.status === 429
      ? '请求过于频繁，请稍后再试'
      : `API ${path} failed`;
    throw new ApiError(
      payload?.message ?? fallbackMessage,
      response.status,
      payload?.code,
      payload?.traceId,
    );
  }

  return (payload as ApiEnvelope<T>).data;
}

export async function refreshAccessToken(refreshToken: string) {
  return apiRequest<{ accessToken: string; refreshToken?: string }>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    retryOn401: false,
  });
}

export async function apiRequest<T>(path: string, init: ApiRequestOptions = {}): Promise<T> {
  const { auth, body, retryOn401 = true, onAuthUpdate, onUnauthorized, headers, ...rest } = init;

  const response = await fetch(joinUrl(getApiBaseUrl(), path), {
    ...rest,
    headers: {
      accept: 'application/json',
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(auth?.accessToken ? { authorization: `Bearer ${auth.accessToken}` } : {}),
      ...(headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (response.status === 401 && retryOn401 && auth?.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(auth.refreshToken);
      const nextAuth = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? auth.refreshToken,
      } satisfies Required<ApiAuth>;
      await onAuthUpdate?.(nextAuth);
      return apiRequest<T>(path, {
        ...init,
        auth: nextAuth,
        retryOn401: false,
      });
    } catch {
      await onUnauthorized?.();
      throw new ApiError('登录状态已失效，请重新登录', 401, 'AUTH_UNAUTHORIZED');
    }
  }

  if (response.status === 401) {
    await onUnauthorized?.();
  }

  return parseResponse<T>(response, path);
}

export function toPageResult<T>(list: T[]): PageResult<T> {
  return {
    list,
    page: { pageNo: 1, pageSize: list.length || 20, total: list.length },
  };
}
