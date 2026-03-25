import 'reflect-metadata';

import test from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../../src/common/permission.guard';
import { RequirePermission } from '../../src/common/permission.decorator';
import { createQaFixture } from './e2e-main-flow.fixture';

function createExecutionContext(request: { authUser?: { permissions?: string[] } }) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as any;
}

class BillingReadHandler {
  @RequirePermission('billing:contracts:view')
  static open() {}
}

class BillingWriteHandler {
  @RequirePermission('billing:payments:manage')
  static mutate() {}
}

test('QA-13 permission boundary keeps teacher out of billing while admin remains allowed', async () => {
  const fixture = createQaFixture();
  const permissionGuard = new PermissionGuard(new Reflector());

  const teacherLogin = await fixture.authService.login('teacher.zhang', 'teacher123');
  const teacherProfile = await fixture.authService.currentUser(teacherLogin.accessToken);
  assert.ok(!teacherProfile.permissions.includes('billing:contracts:view'));
  assert.ok(!teacherProfile.permissions.includes('billing:payments:manage'));

  assert.throws(
    () => permissionGuard.canActivate({
      ...createExecutionContext({ authUser: teacherProfile }),
      getHandler: () => BillingReadHandler.open,
      getClass: () => BillingReadHandler,
    }),
    (error: unknown) => error instanceof ForbiddenException && /missing permission: billing:contracts:view/i.test((error as Error).message),
  );

  assert.throws(
    () => permissionGuard.canActivate({
      ...createExecutionContext({ authUser: teacherProfile }),
      getHandler: () => BillingWriteHandler.mutate,
      getClass: () => BillingWriteHandler,
    }),
    (error: unknown) => error instanceof ForbiddenException && /missing permission: billing:payments:manage/i.test((error as Error).message),
  );

  const adminLogin = await fixture.authService.login('admin', 'admin123');
  const adminProfile = await fixture.authService.currentUser(adminLogin.accessToken);
  assert.ok(adminProfile.permissions.includes('billing:contracts:view'));
  assert.ok(adminProfile.permissions.includes('billing:payments:manage'));

  assert.equal(permissionGuard.canActivate({
    ...createExecutionContext({ authUser: adminProfile }),
    getHandler: () => BillingReadHandler.open,
    getClass: () => BillingReadHandler,
  }), true);

  assert.equal(permissionGuard.canActivate({
    ...createExecutionContext({ authUser: adminProfile }),
    getHandler: () => BillingWriteHandler.mutate,
    getClass: () => BillingWriteHandler,
  }), true);
});
