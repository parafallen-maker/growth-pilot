import { authTest as test, expect } from '../helpers/fixtures';
import { loginAsAdmin } from '../helpers/auth.helper';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('E2E-025 | 未登录重定向', () => {
  test('未登录访问受保护路由被重定向到 /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/students`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page).toHaveURL(/\/login/);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page).toHaveURL(/\/login/);
  });
});
