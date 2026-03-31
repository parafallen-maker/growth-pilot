import { authTest as test, expect } from '../helpers/fixtures';
import { loginAsAdmin } from '../helpers/auth.helper';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('E2E-012 | 错误凭据登录', () => {
  test('错误用户名密码显示登录失败提示', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.getByLabel('用户名').or(page.getByPlaceholder(/用户名|username/i)).first().fill('wrong_user');
    await page.getByLabel('密码').or(page.getByPlaceholder(/密码|password/i)).first().fill('wrong_pass');
    await page.getByRole('button', { name: '登录进入 Dashboard' }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/登录失败|用户名.*错误|密码.*错误/)).toBeVisible();
  });
});
