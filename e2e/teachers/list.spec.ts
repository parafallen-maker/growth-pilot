import { test, expect } from '../helpers/fixtures';

test.describe('E2E-006 教师列表', () => {
  test('教师列表加载', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
    await page.goto('/teachers', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // 等待表格加载
    await expect(page.getByRole('table').first()).toBeVisible({ timeout: 15000 });

    // 验证至少 2 行数据（1 表头 + ≥1 数据行）
    const rows = page.getByRole('row');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
