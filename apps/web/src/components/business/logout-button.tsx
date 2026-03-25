'use client';

import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { clearAuth, readClientAuth } from '@/lib/auth-storage';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const auth = readClientAuth();

    try {
      if (auth) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: { refreshToken: auth.refreshToken },
          auth,
          retryOn401: false,
        });
      }
    } finally {
      clearAuth();
      router.push('/login');
      router.refresh();
    }
  }

  return <button className="btn" type="button" onClick={handleLogout}>退出登录</button>;
}
