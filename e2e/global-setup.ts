import { test as setup, expect } from '@playwright/test';
import { chromium } from '@playwright/test';

const authFile = './e2e/.auth/user.json';

setup('authenticate', async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/login');
  await page.getByLabel('用户名').fill('admin');
  await page.getByLabel('密码').fill('admin123');
  await page.getByRole('button', { name: '登录进入 Dashboard' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000, waitUntil: 'commit' });
  await page.waitForTimeout(2000);

  await context.storageState({ path: authFile });
  await browser.close();
});
