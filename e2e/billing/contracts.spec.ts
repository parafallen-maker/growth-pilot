import { test, expect } from '../helpers/fixtures';

test.describe('E2E-009 合同列表', () => {
  test('合同列表加载', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
    await page.goto('/billing/contracts');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // 等待列表加载
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });
  });
});
