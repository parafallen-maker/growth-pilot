'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiRequest } from '@/lib/api-client';
import { clearAuth, persistAuth } from '@/lib/auth-storage';
import { ErrorState } from '@/components/business/page-states';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result = await apiRequest<{
        accessToken: string;
        refreshToken: string;
      }>('/auth/login', {
        method: 'POST',
        body: { username, password },
        retryOn401: false,
      });

      persistAuth({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      router.push('/dashboard');
      router.refresh();
    } catch (cause) {
      clearAuth();
      setError(cause instanceof ApiError ? cause.message : '登录失败，请检查账号密码后重试');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="username">用户名</label>
        <input id="username" className="input" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="password">密码</label>
        <input id="password" className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
      </div>
      <div className="button-row">
        <button className="btn primary" type="submit" disabled={pending}>{pending ? '登录中...' : '登录进入 Dashboard'}</button>
      </div>
      {error ? <ErrorState title="登录失败" description={error} actionLabel="重新登录" /> : null}
    </form>
  );
}
