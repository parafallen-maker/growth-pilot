import 'server-only';

import { cache } from 'react';
import { apiRequest } from '@/lib/api-client';
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

const fallbackUser: CurrentUser = {
  id: 'u-web-fallback-super-admin',
  username: 'super_admin@growthpilot.local',
  displayName: '运营总控台',
  name: '运营总控台',
  roles: ['super_admin'],
  role: 'super_admin',
  campusIds: ['campus-guiyang'],
  campusName: '贵阳主校区',
  permissions: rolePermissions.super_admin,
};

export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
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
  } catch {
    return fallbackUser;
  }
});

export function asAppRole(role: string): AppRole | null {
  return role in rolePermissions ? (role as AppRole) : null;
}
