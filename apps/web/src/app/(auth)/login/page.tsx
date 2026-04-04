import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/business/login-form';
import { getCurrentUser } from '@/lib/current-user';

export default async function LoginPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect('/dashboard');
  }

  return (
    <main className="auth-shell" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Memphis decorative shapes */}
      <div style={{
        position: 'absolute', top: 80, left: 40, width: 96, height: 96,
        borderRadius: '50%', border: '3px solid #000', background: '#FFE66D',
        transform: 'rotate(-12deg)',
      }} />
      <div style={{
        position: 'absolute', bottom: 80, right: 40, width: 128, height: 128,
        border: '3px solid #000', background: '#4ECDC4',
        transform: 'rotate(12deg)',
      }} />
      <div style={{
        position: 'absolute', top: '25%', right: '8%',
        width: 0, height: 0,
        borderLeft: '40px solid transparent', borderRight: '40px solid transparent',
        borderBottom: '70px solid #FF6B6B',
        transform: 'rotate(45deg)', opacity: 0.6,
      }} />

      <section className="auth-card stack" style={{ position: 'relative', zIndex: 10 }}>
        {/* Corner accent */}
        <div style={{
          position: 'absolute', top: -16, right: -16,
          width: 48, height: 48,
          background: '#FF6B6B', border: '3px solid #000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 24 }}>rocket_launch</span>
        </div>
        <div>
          <h1 style={{
            fontFamily: "'Space Grotesk', 'Noto Sans SC', sans-serif",
            fontWeight: 900,
            fontSize: '2.25rem',
            letterSpacing: '-0.03em',
            marginBottom: 8,
            marginTop: 0,
          }}>
            欢迎回来
          </h1>
          <p className="subtle" style={{ fontWeight: 500 }}>继续您的有目的的顽皮成长之旅</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
