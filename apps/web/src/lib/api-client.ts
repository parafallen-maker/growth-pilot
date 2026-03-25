import 'server-only';

import { cache } from 'react';
import { clearAuthTokens, getAuthTokens, persistAuthTokens } from '@/lib/auth-session';

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

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001/api/v1';

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export function getApiBaseUrl() {
  return process.env.GROWTHPILOT_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  traceId?: string;

  constructor(message: string, options: { status: number; code?: string; traceId?: string }) {
    super(message);
    this.name = 'ApiClientError';
    this.status = options.status;
    this.code = options.code;
    this.traceId = options.traceId;
  }
}

async function parseError(response: Response) {
  const text = await response.text();

  try {
    const envelope = JSON.parse(text) as Partial<ApiEnvelope<unknown>>;
    return new ApiClientError(envelope.message ?? `API request failed with ${response.status}`, {
      status: response.status,
      code: envelope.code,
      traceId: envelope.traceId,
    });
  } catch {
    return new ApiClientError(text || `API request failed with ${response.status}`, {
      status: response.status,
    });
  }
}

const refreshAccessToken = cache(async () => {
  const { refreshToken } = await getAuthTokens();
  if (!refreshToken) {
    await clearAuthTokens();
    return null;
  }

  const response = await fetch(joinUrl(getApiBaseUrl(), '/auth/refresh'), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });

  if (!response.ok) {
    await clearAuthTokens();
    return null;
  }

  const envelope = (await response.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
  await persistAuthTokens(envelope.data);
  return envelope.data.accessToken;
});

async function performRequest<T>(path: string, init: RequestInit = {}, accessToken?: string) {
  const response = await fetch(joinUrl(getApiBaseUrl(), path), {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;
  return envelope.data;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { accessToken } = await getAuthTokens();

  try {
    return await performRequest<T>(path, init, accessToken || undefined);
  } catch (error) {
    if (!(error instanceof ApiClientError) || error.status !== 401) {
      throw error;
    }

    const refreshedAccessToken = await refreshAccessToken();
    if (!refreshedAccessToken) {
      throw error;
    }

    return performRequest<T>(path, init, refreshedAccessToken);
  }
}

export function toPageResult<T>(list: T[]): PageResult<T> {
  return {
    list,
    page: { pageNo: 1, pageSize: list.length || 20, total: list.length },
  };
}
