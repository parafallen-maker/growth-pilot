import { authTest as test, expect } from '../helpers/fixtures';
import { loginAsAdmin } from '../helpers/auth.helper';

test.describe('E2E-002 退出登录', () => {
  test('退出登录并验证保护页重定向', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
    await loginAsAdmin(page);

    // 点击退出登录
    await page.getByText('退出登录').click();

    // 验证跳转到登录页
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: '登录进入 Dashboard' })).toBeVisible({ timeout: 10000 });

    // 未登录访问受保护页被重定向
    await page.goto('/students');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page).toHaveURL(/\/login/);
  });
});
