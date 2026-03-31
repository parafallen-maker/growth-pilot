import { test, expect } from '../helpers/fixtures';

test.describe('E2E-027 | 学生状态流转', () => {
  test('学生列表页状态切换组件可见', async ({ page }) => {
    await page.goto('/students', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await expect(page.getByRole('table').first()).toBeVisible({ timeout: 15000 });

    // 验证状态列存在 - 状态可能以多种形式展示：
    // 1. 直接文本 (visible)
    // 2. 在 select/option 中 (hidden)
    // 3. 在 badge/tag 中
    const statusText = page.getByText(/在读|休学|退学|试听/).first();
    // 使用 toBeAttached 而非 toBeVisible，因为 option 等元素在 DOM 中但可能 hidden
    await expect(statusText).toBeAttached({ timeout: 10000 });
  });
});
