import { test, expect } from '../helpers/fixtures';

test.describe('E2E-016 | 错因分类 CRUD', () => {
  test('错因分类列表加载且新建表单可用', async ({ page }) => {
    await page.goto('/homework/error-taxonomies');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page.getByRole('table').first()).toBeVisible({ timeout: 10000 });

    // 点击新建（是 link 不是 button）
    await page.getByRole('link', { name: /新建错因/ }).click();

    // 验证表单弹出
    await expect(page.getByText('新建错因').first()).toBeVisible({ timeout: 5000 });
  });
});
