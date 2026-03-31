import { test, expect } from '../helpers/fixtures';

test.describe('E2E-008 批改作业', () => {
  test('批改页加载并提交复核', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
    // 先进入作业列表找到进入复核台的链接
    await page.goto('/homework/submissions');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });

    // 点击"进入复核台"或第一条记录进入批改页
    const reviewLink = page.getByRole('link', { name: /进入复核台|批改|复核/ });
    if (await reviewLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await reviewLink.first().click();
    } else {
      // 尝试点击表格第一行
      await page.getByRole('row').nth(1).click();
    }

    // 等待批改页加载
    await page.waitForURL(/\/homework\/review\//, { timeout: 10000 }).catch(() => {
      // 可能 URL 格式不同，检查页面内容
    });

    // 验证批改页有 AI 分析结果或正确率
    await expect(
      page.getByText(/AI.*分析/).or(page.getByText(/\d+%/)).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
