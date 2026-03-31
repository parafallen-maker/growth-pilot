import { test, expect } from '../helpers/fixtures';

test.describe('E2E-004 学生列表', () => {
  test('学生列表加载与搜索筛选', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
    await page.goto('/students', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // 等待页面标题确认页面加载
    await expect(page.getByRole('heading', { name: '学生列表', exact: true })).toBeVisible({ timeout: 15000 });

    // 等待表格加载（可能为空但 table 结构存在）
    await expect(page.getByRole('table').first()).toBeVisible({ timeout: 15000 });

    // 验证表头
    await expect(page.getByRole('columnheader', { name: '学号' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: '姓名' })).toBeVisible({ timeout: 10000 });

    // 搜索 - 用 placeholder 定位
    const searchInput = page.getByPlaceholder('姓名 / 学号 / 家庭 / 老师');
    await searchInput.fill('student-001');
    await page.getByRole('button', { name: '查询' }).click();

    // 等待搜索结果
    await page.waitForTimeout(2000).catch(() => {});
  });
});
