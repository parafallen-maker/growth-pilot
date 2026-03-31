import { test, expect } from '../helpers/fixtures';

test.describe('E2E-010 任务列表 + E2E-011 预警列表', () => {
  test('任务列表加载与状态筛选', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
    await page.goto('/tasks/list');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // 等待列表加载
    await expect(page.getByRole('table').or(page.getByText(/任务/)).first()).toBeVisible({ timeout: 10000 });

    // 状态筛选 — 点击不同状态
    const statusBtns = page.getByRole('button', { name: /待办|进行中|已完成/ });
    const count = await statusBtns.count();
    if (count > 0) {
      await statusBtns.first().click();
      await page.waitForTimeout(2000);
    }
  });

  test('预警列表加载', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // 等待列表加载
    await expect(page.getByRole('table').or(page.getByText(/预警/)).first()).toBeVisible({ timeout: 10000 });

    // 验证操作按钮存在
    await expect(
      page.getByRole('button', { name: /确认接收|标记已解决/ }).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
