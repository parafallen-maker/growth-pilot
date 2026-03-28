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
          <div className="badge">登录</div>
          <h1 style={{ marginBottom: 8 }}>洪基托管成长中心</h1>
          <p className="subtle">请输入账号和密码登录管理后台</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
