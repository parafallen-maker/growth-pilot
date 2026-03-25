import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaFixture } from './e2e-main-flow.fixture';

test('E2E-01 登录与权限：管理员登录 -> me -> refresh -> logout executable', async (t) => {
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

  await t.test('case-refresh-rotation-invalidates-old-refresh-token', () => {
    const loginResult = authService.login('admin', 'admin123');
    const rotated = authService.refresh(loginResult.refreshToken);

    assert.notEqual(rotated.refreshToken, loginResult.refreshToken);
    assert.throws(() => authService.refresh(loginResult.refreshToken), /invalid/i);
    assert.ok(authService.currentUser(rotated.accessToken).permissions.includes('users.read'));
  });

  await t.test('case-old-access-token-is-revoked-after-refresh', () => {
    const loginResult = authService.login('admin', 'admin123');
    const rotated = authService.refresh(loginResult.refreshToken);

    assert.throws(() => authService.currentUser(loginResult.accessToken), /invalid/i);
    assert.equal(authService.currentUser(rotated.accessToken).username, 'admin');
  });

  await t.test('case-invalid-credentials-and-logout-guardrails', () => {
    assert.throws(() => authService.login('admin', 'wrong-password'), /invalid username or password/i);

    const loginResult = authService.login('admin', 'admin123');
    authService.logout(undefined, loginResult.refreshToken);
    assert.throws(() => authService.refresh(loginResult.refreshToken), /invalid/i);
  });
});
