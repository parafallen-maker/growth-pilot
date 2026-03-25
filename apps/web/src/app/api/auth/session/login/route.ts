import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-client';
import { persistAuthTokens } from '@/lib/auth-session';

type LoginPayload = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as LoginPayload;

  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ username: body.username, password: body.password }),
    cache: 'no-store',
  });

  const text = await response.text();
  let parsed: { message?: string; data?: { accessToken?: string; refreshToken?: string } } | null = null;

  try {
    parsed = JSON.parse(text) as { message?: string; data?: { accessToken?: string; refreshToken?: string } };
  } catch {
    parsed = null;
  }

  if (!response.ok || !parsed?.data?.accessToken) {
    return NextResponse.json({ ok: false, error: parsed?.message ?? '登录失败，请检查账号密码。' }, { status: response.status || 500 });
  }

  await persistAuthTokens({
    accessToken: parsed.data.accessToken,
    refreshToken: parsed.data.refreshToken,
  });

  return NextResponse.json({ ok: true });
}
