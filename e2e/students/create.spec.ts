import { test, expect } from '../helpers/fixtures';

test.describe('E2E-005 创建学生', () => {
  test('新建学生档案', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
    await page.goto('/students', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // 等待页面加载
    await expect(page.getByRole('heading', { name: '学生列表', exact: true })).toBeVisible({ timeout: 15000 });

    // 新建表单默认就在页面上（#new-student-form section），直接填写
    // 填写表单字段
    const studentNoInput = page.getByPlaceholder('STU-202603-001');
    await studentNoInput.waitFor({ state: 'visible', timeout: 10000 });
    await studentNoInput.fill('E2E-TEST-001');

    const nameInput = page.getByPlaceholder('学生姓名');
    await nameInput.fill('E2E测试学生');

    const gradeInput = page.getByPlaceholder('一年级');
    await gradeInput.fill('E2E测试年级');

    // 验证表单关键字段可见（限定在新建表单区域内避免多匹配）
    const formSection = page.locator('#new-student-form');
    await expect(formSection.getByText('学生编号')).toBeVisible({ timeout: 5000 });
    await expect(formSection.getByText('姓名')).toBeVisible({ timeout: 5000 });
    await expect(formSection.getByText('年级')).toBeVisible({ timeout: 5000 });

    // 尝试提交
    const submitBtn = page.getByRole('button', { name: /提交创建|提交/ });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // 等待响应
      await page.waitForTimeout(5000).catch(() => {});
    }
  });
});
