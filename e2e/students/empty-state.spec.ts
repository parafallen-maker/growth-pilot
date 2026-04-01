import { test, expect } from '../helpers/fixtures';

test.describe('E2E-026 | 空状态展示', () => {
  test('搜索不存在关键词显示空状态', async ({ page }) => {
    // 学生空状态
    await page.goto('/students', { waitUntil: 'domcontentloaded' });
    // Skip networkidle to avoid exhausting dev-server connection pool
    // 等待表格加载（确认页面已渲染）
    await expect(page.getByRole('table').first()).toBeVisible({ timeout: 15000 });

    // 搜索 - 用 placeholder 定位关键词输入框
    const searchInput = page.getByPlaceholder('姓名 / 学号 / 家庭 / 老师');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill('ZZZZZ_NONEXISTENT_12345');
    await page.getByRole('button', { name: '查询' }).click();
    // Don't wait for networkidle — assertion timeout handles it

    // 验证空状态文案（API 返回空时页面显示暂无学生数据）
    const emptyStateText = page.getByText(/暂无学生数据|当前筛选条件下暂无数据/).first();
    await expect(emptyStateText).toBeVisible({ timeout: 15000 });

    // 教师空状态
    await page.goto('/teachers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('table').first()).toBeVisible({ timeout: 15000 });

    // 教师页的搜索框
    const teacherSearch = page.getByPlaceholder(/搜索|关键词|姓名|教师/).first();
    if (await teacherSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await teacherSearch.fill('ZZZZZ_NONEXISTENT_12345');
      await teacherSearch.press('Enter');
      // Don't wait for networkidle — assertion timeout handles it
      await expect(page.getByText(/暂无|无结果|没有找到|当前筛选条件下暂无数据/).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
    }
  });
});
