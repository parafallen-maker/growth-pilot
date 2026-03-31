import { test, expect } from '../helpers/fixtures';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('E2E-030 | 404 页面', () => {
  test('不存在的路由显示品牌化 404 页', async ({ page }) => {
    await page.goto(`${BASE_URL}/not-exist-page-xyz`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page.getByText(/404|页面.*未找到|不存在/).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /返回首页|首页/ })).toBeVisible({ timeout: 10000 });
  });
});
