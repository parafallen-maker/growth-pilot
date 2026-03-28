import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';

test('qa auth e2e skeleton', async (t) => {
  const { authService } = createQaFixture();

  await t.test('smoke: auth skeleton is executable', async () => {
    const loginResult = await authService.login('admin', 'admin123');
    assert.ok(loginResult.accessToken);
    assert.ok(loginResult.refreshToken);

    const currentUser = await authService.currentUser(loginResult.accessToken);
    assert.equal(currentUser.username, 'admin');

    const refreshResult = await authService.refresh(loginResult.refreshToken);
    assert.ok(refreshResult.accessToken);
    assert.ok(refreshResult.refreshToken);

    await authService.logout(loginResult.accessToken, loginResult.refreshToken);
    await assert.rejects(() => authService.currentUser(loginResult.accessToken));
  });

  await t.test('refresh rotation invalidates old token and keeps new token usable', async () => {
    const loginResult = await authService.login('admin', 'admin123');
    const rotated = await authService.refresh(loginResult.refreshToken);

    assert.notEqual(rotated.refreshToken, loginResult.refreshToken);
    await assert.rejects(() => authService.refresh(loginResult.refreshToken), /invalid/i);
    assert.ok((await authService.currentUser(rotated.accessToken)).permissions.includes('users.read'));
  });

  await t.test('rotated access token replaces previous session token', async () => {
    const loginResult = await authService.login('admin', 'admin123');
    const rotated = await authService.refresh(loginResult.refreshToken);

    await assert.rejects(() => authService.currentUser(loginResult.accessToken), /invalid/i);
    assert.equal((await authService.currentUser(rotated.accessToken)).username, 'admin');
  });

  await t.test('invalid credentials and refresh revoke are enforced', async () => {
    await assert.rejects(() => authService.login('admin', 'wrong-password'), /invalid username or password/i);

    const loginResult = await authService.login('admin', 'admin123');
    await authService.logout(undefined, loginResult.refreshToken);
    await assert.rejects(() => authService.refresh(loginResult.refreshToken), /invalid/i);
  });

  await t.test('case-admin-menu-scope', { todo: '接 apps/web AppShell 菜单裁剪与 403 页面断言' }, () => {});
  await t.test('case-teacher-role-scope', { todo: '补教师角色登录态、按钮权限与 homework/growth 权限矩阵' }, () => {});
  await t.test('case-finance-role-scope', { todo: '补财务角色 billing/communication 权限断言与越权校验' }, () => {});
  await t.test('case-token-expired-redirect', { todo: '补 token 失效后的前端回登录与 toast 提示' }, () => {});
});
