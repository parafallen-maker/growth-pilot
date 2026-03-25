import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-client';
import { clearAuthTokens, getAuthTokens } from '@/lib/auth-session';

export async function POST() {
  const { accessToken, refreshToken } = await getAuthTokens();

  if (accessToken || refreshToken) {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      cache: 'no-store',
    }).catch(() => undefined);
  }

  await clearAuthTokens();

  return NextResponse.json({ ok: true });
}
