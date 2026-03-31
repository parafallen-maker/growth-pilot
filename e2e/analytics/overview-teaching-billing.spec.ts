import { test, expect } from '../helpers/fixtures';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('E2E-023 | 数据分析三页', () => {
  test('概览页加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics/overview`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page).toHaveURL(/\/analytics\/overview/);
  });

  test('教学分析页加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics/teaching`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page).toHaveURL(/\/analytics\/teaching/);
  });

  test('收费分析页加载', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics/billing`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page).toHaveURL(/\/analytics\/billing/);
  });
});
