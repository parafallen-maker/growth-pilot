import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';

test('E2E-01 登录与权限：管理员登录 -> me -> refresh -> logout skeleton', async (t) => {
  const { authService } = createQaFixture();

  await t.test('smoke: auth skeleton is executable', () => {
    const loginResult = authService.login('admin', 'admin123');
    assert.ok(loginResult.accessToken);
    assert.equal(loginResult.user.username, 'admin');

    const currentUser = authService.currentUser(loginResult.accessToken);
    assert.ok(currentUser.permissions.includes('jobs.read'));

    const refreshResult = authService.refresh(loginResult.refreshToken);
    assert.ok(refreshResult.accessToken);
    assert.ok(refreshResult.refreshToken);

    authService.logout(loginResult.accessToken, loginResult.refreshToken);
    assert.throws(() => authService.currentUser(loginResult.accessToken));
  });

  await t.test('case-admin-menu-scope', { todo: '接 apps/web AppShell 菜单裁剪与 403 页面断言' }, () => {});
  await t.test('case-teacher-role-scope', { todo: '补教师角色登录态、按钮权限与 homework/growth 权限矩阵' }, () => {});
  await t.test('case-finance-role-scope', { todo: '补财务角色 billing/communication 权限断言与越权校验' }, () => {});
  await t.test('case-token-expired-redirect', { todo: '补 token 失效后的前端回登录与 toast 提示' }, () => {});
});
