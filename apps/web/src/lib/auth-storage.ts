'use client';

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/api-client';

const ACCESS_TOKEN_STORAGE_KEY = 'growthpilot.accessToken';
const REFRESH_TOKEN_STORAGE_KEY = 'growthpilot.refreshToken';

function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
}

export function persistAuth(auth: { accessToken: string; refreshToken: string }) {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, auth.accessToken);
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, auth.refreshToken);
  setCookie(ACCESS_TOKEN_COOKIE, auth.accessToken);
  setCookie(REFRESH_TOKEN_COOKIE, auth.refreshToken);
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  clearCookie(ACCESS_TOKEN_COOKIE);
  clearCookie(REFRESH_TOKEN_COOKIE);
}

export function readClientAuth(): { accessToken: string; refreshToken: string } | null {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}
