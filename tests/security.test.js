import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, digestCode } from '../server/security.js';
test('管理员密码加盐存储，正确密码通过，错误或损坏的哈希拒绝', async () => {
  const first = await hashPassword('a-long-admin-password');
  const second = await hashPassword('a-long-admin-password');
  assert.notEqual(first, second);
  assert(!first.includes('a-long-admin-password'));
  assert(await verifyPassword('a-long-admin-password', first));
  assert.equal(await verifyPassword('incorrect', first), false);
  assert.equal(await verifyPassword('password', 'invalid'), false);
});
test('验证码摘要绑定邮箱和服务端密钥', () => {
  const digest = digestCode('secret', 'a@example.com', '123456');
  assert.notEqual(digest, '123456');
  assert.notEqual(digest, digestCode('secret', 'b@example.com', '123456'));
  assert.notEqual(digest, digestCode('other-secret', 'a@example.com', '123456'));
});
