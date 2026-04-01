import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { PasswordService } from '../src/common/security';
import { UsersRepository } from '../src/modules/users/repository/users.repository';
import { UsersService } from '../src/modules/users/service/users.service';

function resetUsersPersistence() {
  rmSync('.data/users.json', { force: true });
}

test('password service hashes with bcrypt and rejects invalid hash payloads', () => {
  const passwordService = new PasswordService();
  const password = 'Admin123!Secure';
  const hash = passwordService.hash(password);

  assert.notEqual(hash, password);
  assert.match(hash, /^\$2[aby]\$12\$/);
  assert.equal(passwordService.verify(password, hash), true);
  assert.equal(passwordService.verify('wrong-password', hash), false);
  assert.equal(passwordService.verify(password, 'admin123'), false);
  assert.equal(passwordService.verify(password, '$2b$12$not-a-real-hash'), false);
});

test('seeded and newly created users persist only password hashes', async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'growthpilot-test-secret-with-32-chars!';
  resetUsersPersistence();

  const usersService = new UsersService(new UsersRepository(), new PasswordService());

  const seededAdmin = await usersService.validateCredentials('admin', 'admin123');
  assert.ok(seededAdmin);

  const created = await usersService.createUser({
    username: 'secure.teacher',
    password: 'Teacher123!Secure',
    displayName: '安全老师',
    roleIds: ['teacher'],
    campusIds: ['campus-guanshanhu'],
  });

  assert.deepEqual(Object.keys(created).sort(), ['campusIds', 'displayName', 'id', 'roles', 'status', 'username']);
  assert.equal(await usersService.validateCredentials('secure.teacher', 'Teacher123!Secure')?.then(Boolean), true);
  assert.equal(await usersService.validateCredentials('secure.teacher', 'wrong-password'), undefined);

  const persisted = JSON.parse(readFileSync('.data/users.json', 'utf8')) as {
    users: Array<{ username: string; passwordHash: string }>;
  };

  const persistedAdmin = persisted.users.find((user) => user.username === 'admin');
  const persistedTeacher = persisted.users.find((user) => user.username === 'secure.teacher');

  assert.ok(persistedAdmin);
  assert.ok(persistedTeacher);
  assert.match(persistedAdmin.passwordHash, /^\$2[aby]\$12\$/);
  assert.match(persistedTeacher.passwordHash, /^\$2[aby]\$12\$/);
  assert.notEqual(persistedAdmin.passwordHash, 'admin123');
  assert.notEqual(persistedTeacher.passwordHash, 'Teacher123!Secure');
});
