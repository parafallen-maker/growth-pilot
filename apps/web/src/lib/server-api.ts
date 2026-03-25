import 'server-only';

import { getAuthTokens } from '@/lib/auth-session';
import { apiRequest, type ApiError } from '@/lib/api-client';

export async function serverApiRequest<T>(path: string, init: Parameters<typeof apiRequest<T>>[1] = {}) {
  const auth = await getAuthTokens();
  return apiRequest<T>(path, {
    ...init,
    auth,
    retryOn401: Boolean(auth.refreshToken),
  });
}

export function isApiError(error: unknown): error is ApiError {
  return !!error && typeof error === 'object' && 'status' in error;
}
