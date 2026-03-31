import { test, expect } from '../helpers/fixtures';

const BASE_URL = '/';

test.describe('E2E-017 成长观察', () => {
  test('成长观察列表加载且新建表单可用', async ({ page }) => {
    await page.goto(`${BASE_URL}growth/observations`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page.getByRole('table').or(page.getByText(/观察/)).first()).toBeVisible({ timeout: 10000 });

    // 点击新建（是 link 不是 button）
    await page.getByRole('link', { name: /新建观察/ }).click();

    // 验证表单弹出
    await expect(page.getByText('新建成长观察').first()).toBeVisible({ timeout: 5000 });
  });
});
