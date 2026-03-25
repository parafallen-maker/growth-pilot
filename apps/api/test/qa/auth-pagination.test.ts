import 'reflect-metadata';

import test from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiAuthGuard } from '../../src/common/auth.guard';
import { PERMISSION_METADATA_KEY, RequirePermission } from '../../src/common/permission.decorator';
import { PermissionGuard } from '../../src/common/permission.guard';
import { createQaFixture } from './e2e-main-flow.fixture';

function createExecutionContext(request: { headers?: Record<string, string | undefined>; authUser?: { permissions?: string[] } }) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as any;
}

class ProtectedHandler {
  @RequirePermission('jobs.read')
  static listJobs() {}
}

test('QA-07 auth edge cases reject missing, malformed, expired, and insufficient auth', async () => {
  const fixture = createQaFixture();
  const authGuard = new ApiAuthGuard(fixture.authService);
  const permissionGuard = new PermissionGuard(new Reflector());

  await assert.rejects(
    () => authGuard.canActivate(createExecutionContext({ headers: {} })),
    (error: unknown) => error instanceof UnauthorizedException && /missing bearer token/i.test(error.message),
  );

  await assert.rejects(
    () => authGuard.canActivate(createExecutionContext({ headers: { authorization: 'Basic not-a-bearer-token' } })),
    (error: unknown) => error instanceof UnauthorizedException && /missing bearer token/i.test(error.message),
  );

  await assert.rejects(
    () => fixture.authService.currentUser('broken.token.value'),
    (error: unknown) => error instanceof UnauthorizedException && /access token is invalid/i.test(error.message),
  );

  const teacherLogin = await fixture.authService.login('teacher.zhang', 'teacher123');
  const teacherRequest = {
    authUser: await fixture.authService.currentUser(teacherLogin.accessToken),
  };
  assert.throws(
    () => permissionGuard.canActivate({
      ...createExecutionContext(teacherRequest),
      getHandler: () => ProtectedHandler.listJobs,
      getClass: () => ProtectedHandler,
    }),
    (error: unknown) => error instanceof ForbiddenException && /missing permission: jobs.read/i.test((error as Error).message),
  );
});

test('QA-08 paged services keep pageNo/pageSize/total shape consistent', async () => {
  const fixture = createQaFixture();
  const query = { pageNo: 2, pageSize: 5 };

  const pages = [
    await fixture.usersService.listUsers(undefined, 2, 5),
    await fixture.studentsService.list(query),
    await fixture.familiesService.list(query),
    await fixture.homeworkService.listSubmissions(query),
    await fixture.growthService.listRubrics(query),
    await fixture.growthService.listObservations(query),
    await fixture.growthService.listGoals(query),
    await fixture.growthService.listReports(query),
    fixture.billingService.listProducts(query),
    fixture.billingService.listContracts(query),
    fixture.billingService.listInvoices(query),
    fixture.billingService.listRenewals(query),
  ];

  for (const page of pages) {
    assert.ok(Array.isArray(page.list));
    assert.equal(page.page.pageNo, 2);
    assert.equal(page.page.pageSize, 5);
    assert.equal(typeof page.page.total, 'number');
  }
});
