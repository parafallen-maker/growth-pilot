import { test as base, expect, type Page } from '@playwright/test';

let _cachedState: { cookies: any[]; origins: any[] } | null = null;
let _loginCount = 0;

async function doLogin(page: Page): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Hard reload login page to avoid stale connection issues
      await page.goto('/login', { timeout: 15000, waitUntil: 'domcontentloaded' });
      await page.getByLabel('用户名').fill('admin');
      await page.getByLabel('密码').fill('admin123');
      await page.getByRole('button', { name: '登录进入 Dashboard' }).click();
      await Promise.race([
        page.waitForURL('**/dashboard**', { timeout: 15000 }),
        page.getByText(/工作台|Dashboard/).waitFor({ state: 'visible', timeout: 15000 }),
      ]);
      await page.waitForTimeout(500);
      _loginCount++;
      return true;
    } catch {
      await page.waitForTimeout(1000);
    }
  }
  return false;
}

export const authTest = base.extend<{ page: Page }>({});

export const test = base.extend<{ page: Page }>({}).extend({
  page: async ({ browser }, use, testInfo) => {
    const baseURL = testInfo.project.use?.baseURL as string || 'http://localhost:3000';

    if (testInfo.file.includes('auth/')) {
      // Auth tests manage their own login; clear cache if it was a logout test
      if (testInfo.title.includes('退出')) {
        _cachedState = null;
      }
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      await use(page);
      await context.close();
      return;
    }

    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();

    if (_cachedState) {
      await context.addCookies(_cachedState.cookies);
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      if (page.url().includes('/login')) {
        _cachedState = null;
      }
    }

    if (!_cachedState) {
      const ok = await doLogin(page);
      if (ok) {
        _cachedState = await context.storageState();
      }
    }

    await use(page);
    await context.close();
  },
});

export { expect };
