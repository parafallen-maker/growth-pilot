import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f9fafb',
      color: '#1f2937',
    }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '4rem', margin: '0', color: '#6366f1' }}>404</h1>
        <p style={{ fontSize: '1.25rem', margin: '1rem 0', color: '#6b7280' }}>页面不存在</p>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '2rem' }}>
          Growth Pilot · 成长领航
        </p>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.5rem',
            backgroundColor: '#6366f1',
            color: '#fff',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
