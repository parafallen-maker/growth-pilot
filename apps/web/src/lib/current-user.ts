import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { apiRequest, ApiClientError } from '@/lib/api-client';
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

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const profile = await apiRequest<{
      id: string;
      username: string;
      displayName: string;
      roles: string[];
      campusIds: string[];
      permissions: string[];
    }>('/auth/me');

    const primaryRole = profile.roles[0] ?? 'unknown';
    const primaryCampusId = profile.campusIds[0] ?? null;

    return {
      ...profile,
      name: profile.displayName,
      role: primaryRole,
      campusName: primaryCampusId === 'campus-guiyang' ? '贵阳主校区' : primaryCampusId ?? '全局',
    };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      return null;
    }

    throw error;
  }
});

export async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }
  return currentUser;
}

export function asAppRole(role: string): AppRole | null {
  return role in rolePermissions ? (role as AppRole) : null;
}
