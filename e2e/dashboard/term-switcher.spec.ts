import { test, expect } from '../helpers/fixtures';

test.describe('E2E-013 学期切换', () => {
  test('点击切学期按钮弹出学期选择弹窗', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    await page.getByRole('button', { name: /切学期/ }).click();

    // 弹窗没有 ARIA role，用文本匹配
    await expect(page.getByText('切换学期').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('学期').first()).toBeVisible();
  });
});
