import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, apiRequest } from '@/lib/api-client';
import { rolePermissions, type AppRole } from '@/lib/navigation';

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  name: string;
  roles: string[];
  role: string;
  campusIds: string[];
  campusName: string;
  permissions: string[];
};

async function readServerAuth() {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null,
  };
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const auth = await readServerAuth();
  if (!auth.accessToken) return null;

  try {
    const profile = await apiRequest<{
      id: string;
      username: string;
      displayName: string;
      roles: string[];
      campusIds: string[];
      permissions: string[];
    }>('/auth/me', {
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });

    const primaryRole = profile.roles[0] ?? 'unknown';
    const primaryCampusId = profile.campusIds[0] ?? null;

    return {
      ...profile,
      name: profile.displayName,
      role: primaryRole,
      campusName: primaryCampusId === 'campus-guiyang' ? '贵阳主校区' : primaryCampusId ?? '全局',
    };
  } catch {
    return null;
  }
});

export async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('authenticated current user is required');
  }
  return currentUser;
}

export function asAppRole(role: string): AppRole | null {
  return role in rolePermissions ? (role as AppRole) : null;
}
