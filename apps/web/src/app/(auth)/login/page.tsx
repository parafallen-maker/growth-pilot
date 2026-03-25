import { redirect } from 'next/navigation';
import { ErrorState } from '@/components/business/page-blocks';
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
          <div className="badge">P01 Login</div>
          <h1 style={{ marginBottom: 8 }}>Growth Pilot 后台登录</h1>
          <p className="subtle">真实登录已接到 /auth/login。登录成功写入会话 Cookie，失败直接回显错误信息。</p>
        </div>
        <LoginForm />
        <ErrorState title="登录失败时会显示这里的同款错误容器" description="现在错误态已统一到 ErrorState，别再各页自己拼了。" />
      </section>
    </main>
  );
}
