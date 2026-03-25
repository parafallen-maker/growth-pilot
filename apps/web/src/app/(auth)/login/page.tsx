import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/business/login-form';
import { getCurrentUser } from '@/lib/current-user';

export default async function LoginPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect('/dashboard');
  }

  return (
    <main className="auth-shell">
      <section className="auth-card stack">
        <div>
          <div className="badge">Login</div>
          <h1 style={{ marginBottom: 8 }}>Growth Pilot 后台登录</h1>
          <p className="subtle">现在不是摆拍页了，真打 POST /auth/login，成了就进 dashboard，败了就老实报错。</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
