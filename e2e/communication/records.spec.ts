import { test, expect } from '../helpers/fixtures';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('E2E-022 | 沟通记录', () => {
  test('沟通记录列表加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/communication/records`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page.getByRole('table').or(page.getByText(/沟通/)).first()).toBeVisible({ timeout: 10000 });
  });
});
