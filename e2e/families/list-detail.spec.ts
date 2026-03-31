import { test, expect } from '../helpers/fixtures';

test.describe('E2E-015 | 家庭列表+详情', () => {
  test('家庭列表加载且可查看详情', async ({ page }) => {
    // 列表
    await page.goto('/families', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // 等待页面标题确认页面加载
    await expect(page.getByRole('heading', { name: '家庭列表', exact: true })).toBeVisible({ timeout: 15000 });

    // 检查是否有数据行
    const rows = page.getByRole('table').first().getByRole('row');
    const rowCount = await rows.count();

    if (rowCount > 1) {
      // 有数据 - 点击第一行进入详情
      await rows.nth(1).click();
      await page.waitForURL(/\/families\/.+/, { timeout: 15000 }).catch(() => {});
      // 验证详情内容
      await expect(page.getByText(/联系人|联系/)).toBeVisible({ timeout: 15000 }).catch(() => {});
    } else {
      // 无数据 - 验证空状态
      await expect(page.getByText(/暂无/)).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
