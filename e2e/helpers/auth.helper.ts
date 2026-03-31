import { type Page, expect } from '@playwright/test';

/**
 * 以管理员身份登录 GrowthPilot
 * 账号: admin / admin123
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/login');

  // React controlled input 必须用 fill()
  await page.getByLabel('用户名').fill('admin');
  await page.getByLabel('密码').fill('admin123');

  // 点击登录按钮
  await page.getByRole('button', { name: '登录进入 Dashboard' }).click();

  // Next.js 客户端路由用 pushState，waitUntil: 'commit' 不可靠
  // 用 Promise.race 兼容两种情况
  await Promise.race([
    page.waitForURL('**/dashboard**', { timeout: 15000 }),
    page.getByText(/工作台|Dashboard/).waitFor({ state: 'visible', timeout: 15000 }),
  ]);
}
