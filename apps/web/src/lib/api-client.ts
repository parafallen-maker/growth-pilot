import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';

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
const ACCESS_TOKEN_COOKIE = 'gp_access_token';
const DEFAULT_DEV_USERNAME = 'super_admin@growthpilot.local';
const DEFAULT_DEV_PASSWORD = 'admin123';

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export function getApiBaseUrl() {
  return process.env.GROWTHPILOT_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

const loginForDev = cache(async () => {
  const response = await fetch(joinUrl(getApiBaseUrl(), '/auth/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: process.env.GROWTHPILOT_DEV_USERNAME ?? DEFAULT_DEV_USERNAME,
      password: process.env.GROWTHPILOT_DEV_PASSWORD ?? DEFAULT_DEV_PASSWORD,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to bootstrap dev auth: ${response.status}`);
  }

  const envelope = (await response.json()) as ApiEnvelope<{ accessToken: string }>;
  return envelope.data.accessToken;
});

export const getAccessToken = cache(async () => {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (cookieToken) return cookieToken;

  const envToken = process.env.GROWTHPILOT_ACCESS_TOKEN;
  if (envToken) return envToken;

  return loginForDev();
});

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(joinUrl(getApiBaseUrl(), path), {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${path} failed: ${response.status} ${text}`);
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;
  return envelope.data;
}

export function toPageResult<T>(list: T[]): PageResult<T> {
  return {
    list,
    page: { pageNo: 1, pageSize: list.length || 20, total: list.length },
  };
}
