import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';

let _cachedState: { cookies: any[]; origins: any[] } | null = null;

async function doLogin(page: Page): Promise<boolean> {
  try {
    await page.goto('/login', { timeout: 10000 });
    await page.getByLabel('用户名').fill('admin');
    await page.getByLabel('密码').fill('admin123');
    await page.getByRole('button', { name: '登录进入 Dashboard' }).click();
    await Promise.race([
      page.waitForURL('**/dashboard**', { timeout: 25000 }),
      page.getByText(/工作台|Dashboard/).waitFor({ state: 'visible', timeout: 25000 }),
    ]);
    await page.waitForTimeout(300);
    return true;
  } catch {
    return false;
  }
}

export const authTest = base.extend<{ page: Page }>({});

export const test = base.extend<{ page: Page }>({}).extend({
  page: async ({ browser }, use, testInfo) => {
    const baseURL = testInfo.project.use?.baseURL as string || 'http://localhost:3000';

    // Auth tests manage their own login; clear cache after logout test
    if (testInfo.file.includes('auth/')) {
      if (testInfo.title.includes('退出')) {
        _cachedState = null;
      }
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      await use(page);
      await context.close();
      return;
    }

    let context: BrowserContext = await browser.newContext({ baseURL });
    let page: Page = await context.newPage();

    // Try cached state first
    if (_cachedState) {
      await context.addCookies(_cachedState.cookies);
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      if (page.url().includes('/login')) {
        _cachedState = null;
      }
    }

    // Fresh login needed
    if (!_cachedState) {
      let ok = await doLogin(page);
      if (!ok) {
        // Server may be congested — recreate context to release TCP connections
        await context.close();
        context = await browser.newContext({ baseURL });
        page = await context.newPage();
        ok = await doLogin(page);
      }
      if (ok) {
        _cachedState = await context.storageState();
      }
    }

    await use(page);
    await context.close();
  },
});

export { expect };
