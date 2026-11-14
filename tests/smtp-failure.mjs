import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import { sha256 } from '../server/security.js';
assert.equal(process.env.TEST_URL, 'http://poems:8001');
const email = `smtp-failure-${randomUUID()}@example.com`;
const response = await fetch(`${process.env.TEST_URL}/api/auth/code`, {
  method: 'POST', headers: { Origin: process.env.TEST_ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
});
assert.equal(response.status, 503);
assert.match((await response.json()).error, /发送失败/);
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();
try {
  assert.equal(await redis.exists(`code:${sha256(email)}`), 0);
  assert.equal(await redis.exists(`code-cooldown:${sha256(email)}`), 0);
  console.log('PASS: SMTP failure returns a retryable error and removes unusable code/cooldown');
} finally { await redis.quit(); }
