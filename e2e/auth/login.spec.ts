import { authTest as test, expect } from '../helpers/fixtures';
import { loginAsAdmin } from '../helpers/auth.helper';

test.describe('E2E-001 管理员登录', () => {
  test('登录成功跳转 Dashboard', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
    await loginAsAdmin(page);

    // 验证跳转到 Dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 验证数据卡片可见（任一即可）
    await expect(page.getByText('在读学生数')).toBeVisible({ timeout: 10000 });
  });
});
