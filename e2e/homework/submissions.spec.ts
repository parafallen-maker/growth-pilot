import { test, expect } from '../helpers/fixtures';

test.describe('E2E-007 作业提交列表', () => {
  test('作业提交列表与筛选', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
    await page.goto('/homework/submissions');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // 等待列表加载
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });

    // 验证筛选区存在
    const filterArea = page.locator('text=/筛选|学科|状态|日期/');
    await expect(filterArea.first()).toBeVisible({ timeout: 10000 });

    // 验证 AI 分析触发按钮可用
    const aiBtn = page.getByRole('button', { name: /触发.*AI|AI.*分析/ });
    await expect(aiBtn.first()).toBeEnabled({ timeout: 10000 });
  });
});
