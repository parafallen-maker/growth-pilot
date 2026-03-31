import { test, expect } from '../helpers/fixtures';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('E2E-018 | 考勤看板', () => {
  test('考勤看板加载且有签到/异常统计', async ({ page }) => {
    await page.goto(`${BASE_URL}/attendance/board`);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page.getByText(/签到|异常|考勤/).first()).toBeVisible({ timeout: 10000 });
  });
});
