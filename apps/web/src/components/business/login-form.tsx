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
        <label htmlFor="username" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16 }}>
          用户名/邮箱
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="username"
            className="input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            placeholder="输入您的用户名"
            style={{ paddingRight: 40 }}
          />
          <span className="material-symbols-outlined" style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            opacity: 0.4, fontSize: 20,
          }}>person</span>
        </div>
      </div>
      <div className="field">
        <label htmlFor="password" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16 }}>
          密码
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="输入您的密码"
            style={{ paddingRight: 40 }}
          />
          <span className="material-symbols-outlined" style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            opacity: 0.4, fontSize: 20,
          }}>lock</span>
        </div>
      </div>
      <div className="button-row">
        <button
          className="btn primary"
          type="submit"
          disabled={pending}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: 18,
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {pending ? '登录中...' : '登录'}
          {!pending && <span className="material-symbols-outlined">arrow_forward</span>}
        </button>
      </div>
      {error ? <ErrorState title="登录失败" description={error} actionLabel="重新登录" /> : null}
    </form>
  );
}
