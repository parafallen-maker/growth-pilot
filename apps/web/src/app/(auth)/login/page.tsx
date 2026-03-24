import Link from 'next/link';
import { StateBlock } from '@/components/business/page-blocks';

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card stack">
        <div>
          <div className="badge">P01 Login</div>
          <h1 style={{ marginBottom: 8 }}>Growth Pilot 后台登录</h1>
          <p className="subtle">已预埋用户名/密码表单位、登录失败提示位、成功跳转 dashboard 入口。</p>
        </div>
        <div className="field">
          <label>用户名</label>
          <input className="input" defaultValue="super_admin@growthpilot.local" />
        </div>
        <div className="field">
          <label>密码</label>
          <input className="input" type="password" defaultValue="••••••••" />
        </div>
        <div className="button-row">
          <Link className="btn primary" href="/dashboard">登录进入 Dashboard</Link>
          <button className="btn">刷新 Token（占位）</button>
        </div>
        <StateBlock state="error" title="登录接口" actionLabel="重新登录" />
      </section>
    </main>
  );
}
