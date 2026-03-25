'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('super_admin@growthpilot.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/session/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !result.ok) {
        setError(result.error ?? '登录失败，请检查账号密码。');
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('网络开小差了，稍后再试。');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="username">用户名</label>
        <input id="username" className="input" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">密码</label>
        <input id="password" className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
      </div>
      {error ? <div className="code">{error}</div> : null}
      <div className="button-row">
        <button className="btn primary" type="submit" disabled={pending}>{pending ? '登录中…' : '登录进入 Dashboard'}</button>
      </div>
    </form>
  );
}
