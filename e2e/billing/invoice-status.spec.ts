import { test, expect } from '../helpers/fixtures';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('E2E-028 | 账单状态流转', () => {
  test('账单列表页状态列可见', async ({ page }) => {
    await page.goto(`${BASE_URL}/billing/invoices`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page.getByRole('table').first()).toBeVisible({ timeout: 10000 });

    // 简化：验证状态相关文本存在
    await expect(page.getByText(/已付|未付|逾期|欠费/).first()).toBeVisible({ timeout: 10000 });
  });
});
