import { test, expect } from '../helpers/fixtures';

test.describe('E2E-003 Dashboard 数据卡片', () => {
  test('Dashboard 数据卡片渲染', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // 验证四张数据卡片
    await expect(page.getByText('在读学生数')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('待复核作业')).toBeVisible();
    await expect(page.getByText('周报完成率')).toBeVisible();
    await expect(page.getByText('本月实收')).toBeVisible();

    // 验证切学期按钮可见
    await expect(page.getByText('切学期')).toBeVisible();
  });
});
