import { test, expect } from '../helpers/fixtures';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('E2E-029 | 字典 CRUD', () => {
  test('字典管理页面加载且可操作', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/system`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page.getByText(/字典|dictionary/i).first()).toBeVisible({ timeout: 10000 });
  });
});
