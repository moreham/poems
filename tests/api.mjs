import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import { sha256 } from '../server/security.js';
import { mailCode } from './helpers.mjs';
const base = process.env.TEST_URL;
const origin = process.env.TEST_ORIGIN;
assert(base && origin && process.env.REDIS_URL, '请在隔离测试环境运行');
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();
class Client {
  cookies = new Map();
  async request(path, { method = 'GET', body, status = 200, requestOrigin = origin } = {}) {
    const response = await fetch(`${base}/api${path}`, { method, headers: { Origin: requestOrigin,
      Cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '),
      ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(';'); const split = pair.indexOf('=');
      this.cookies.set(pair.slice(0, split), pair.slice(split + 1));
      assert(line.includes('HttpOnly') && line.includes('SameSite=Lax'), '会话应使用 HttpOnly SameSite Cookie');
    }
    const data = await response.json();
    assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(data)}`);
    return data;
  }
}
const post = (body, status = 200) => ({ method: 'POST', body, status });
const unique = randomUUID().slice(0, 8);
const emailA = `reader-${unique}@example.com`, emailB = `other-${unique}@example.com`;
const guest = new Client(), user = new Client(), other = new Client(), admin = new Client();
let userId;
try {
  const initial = await guest.request('/poems');
  assert(initial.poems.length >= 288);
  await guest.request('/submissions', post({}, 401));
  await guest.request('/admin/submissions', { status: 401 });
  await guest.request('/auth/code', { ...post({ email: emailA }, 403), requestOrigin: 'https://attacker.example' });
  const sent = await user.request('/auth/code', post({ email: emailA }));
  assert.equal(sent.code, undefined);
  await user.request('/auth/code', post({ email: emailA }, 429));
  const codeA = await mailCode(process.env.MAILPIT_URL, emailA);
  const storedCode = await redis.hGetAll(`code:${sha256(emailA)}`);
  assert(storedCode.digest && storedCode.digest !== codeA);
  assert(await redis.ttl(`code:${sha256(emailA)}`) <= 600);
  userId = (await user.request('/auth/login', post({ email: emailA.toUpperCase(), code: codeA }))).user.id;
  await other.request('/auth/login', post({ email: emailA, code: codeA }, 400));
  assert.equal((await user.request('/auth/me')).user.email, emailA);
  await user.request('/admin/submissions', { status: 401 });
  await user.request('/admin/submissions/1/review', post({ status: 'approved' }, 401));
  // Even copying a user token into the admin cookie cannot grant administrator access.
  const forged = new Client(); forged.cookies.set('poems_admin', user.cookies.get('poems_user'));
  await forged.request('/admin/submissions', { status: 401 });
  await other.request('/auth/code', post({ email: emailB }));
  await other.request('/auth/login', post({ email: emailB, code: await mailCode(process.env.MAILPIT_URL, emailB) }));
  await admin.request('/admin/login', post({ key: '' }, 400));
  await admin.request('/admin/login', post({ username: 'admin', password: 'old-password' }, 400));
  await admin.request('/admin/login', post({ key: 'incorrect' }, 401));
  await admin.request('/admin/login', post({ key: process.env.TEST_ADMIN_KEY }));
  await admin.request('/submissions', post({}, 401));
  const entry = { request_id: randomUUID(), verse: `测试清风入诗笺${unique}`, title: '测试作品', author: '测试作者', meaning: '<script>alert(1)</script>只应作为文本呈现', original: '测试原文', source_url: 'https://example.com/source' };
  const first = await user.request('/submissions', post(entry, 201));
  const retry = await user.request('/submissions', post(entry, 201));
  assert.equal(first.id, retry.id);
  await user.request('/submissions', post({ ...entry, request_id: randomUUID() }, 409));
  assert(!(await guest.request('/poems')).poems.some(item => item.verse === entry.verse));
  assert.equal((await other.request('/submissions')).total, 0);
  assert((await user.request('/submissions')).items.every(item => item.status === 'pending'));
  await user.request('/submissions?page=-1', { status: 400 });
  const reviewResults = await Promise.all(['approved', 'rejected'].map(async status => {
    const response = await fetch(`${base}/api/admin/submissions/${first.id}/review`, { method: 'POST', headers: {
      Origin: origin, Cookie: `poems_admin=${admin.cookies.get('poems_admin')}`, 'Content-Type': 'application/json'
    }, body: JSON.stringify({ status }) });
    return { status: response.status, data: await response.json() };
  }));
  assert.deepEqual(reviewResults.map(result => result.status).sort(), [200, 409]);
  const decision = reviewResults.find(result => result.status === 200).data.status;
  assert.equal((await guest.request('/poems')).poems.some(item => item.verse === entry.verse), decision === 'approved');
  const approvedEntry = { ...entry, request_id: randomUUID(), verse: `测试明月照归人${unique}` };
  const approved = await user.request('/submissions', post(approvedEntry, 201));
  await admin.request(`/admin/submissions/${approved.id}/review`, post({ status: 'approved' }));
  assert((await guest.request('/poems')).poems.some(item => item.verse === approvedEntry.verse));
  await admin.request(`/admin/submissions/${approved.id}/review`, post({ status: 'rejected' }, 409));
  const rejectedEntry = { ...entry, request_id: randomUUID(), verse: `测试驳回的诗句${unique}` };
  const rejected = await user.request('/submissions', post(rejectedEntry, 201));
  await admin.request(`/admin/submissions/${rejected.id}/review`, post({ status: 'rejected', reason: '请核对出处' }));
  assert((await user.request('/submissions?status=rejected')).items.some(item => item.rejection_reason === '请核对出处'));
  assert(!(await guest.request('/poems')).poems.some(item => item.verse === rejectedEntry.verse));
  // Pagination and the hourly submission limit, using only this disposable environment.
  await redis.del(`rate:submit:${userId}`);
  for (let i = 0; i < 10; i++) await user.request('/submissions', post({ ...entry, request_id: randomUUID(), verse: `测试分页诗句${unique}第${i}条` }, 201));
  await user.request('/submissions', post({ ...entry, request_id: randomUUID(), verse: `超限投稿${unique}` }, 429));
  const page1 = await user.request('/submissions?page=1');
  const page2 = await user.request('/submissions?page=2');
  assert.equal(page1.items.length, 10); assert(page2.items.length > 0);
  assert(!page1.items.some(item => page2.items.some(second => second.id === item.id)));
  assert((await admin.request('/admin/submissions?status=all&page=2')).items.length > 0);
  const verse = initial.poems[0].verse, draw = 'a'.repeat(32);
  const query = '/likes?' + new URLSearchParams({ poem: verse, draw_id: draw });
  const count = (await guest.request(query)).count;
  assert.equal((await guest.request('/likes', post({ poem: verse, draw_id: draw, liked: true }))).count, count + 1);
  assert.equal((await guest.request('/likes', post({ poem: verse, draw_id: draw, liked: true }))).count, count + 1);
  assert.equal((await guest.request('/likes', post({ poem: verse, draw_id: draw, liked: false }))).count, count);
  assert.equal((await guest.request('/likes', post({ poem: verse, draw_id: draw, liked: false }))).count, count);
  await guest.request('/likes', post({ poem: verse, draw_id: draw, liked: true }));
  await guest.request('/likes', post({ poem: verse, draw_id: 'b'.repeat(32), liked: true }));
  assert.equal((await guest.request(query)).count, count + 2);
  // Five wrong attempts consume the code; expiration is enforced by Redis.
  const lockedEmail = `locked-${unique}@example.com`;
  await guest.request('/auth/code', post({ email: lockedEmail }));
  const validCode = await mailCode(process.env.MAILPIT_URL, lockedEmail);
  const wrongCode = validCode === '111111' ? '222222' : '111111';
  for (let i = 0; i < 5; i++) await guest.request('/auth/login', post({ email: lockedEmail, code: wrongCode }, 400));
  await guest.request('/auth/login', post({ email: lockedEmail, code: validCode }, 400));
  const expiredEmail = `expired-${unique}@example.com`;
  await guest.request('/auth/code', post({ email: expiredEmail }));
  const expiredCode = await mailCode(process.env.MAILPIT_URL, expiredEmail);
  await redis.expire(`code:${sha256(expiredEmail)}`, 0);
  await guest.request('/auth/login', post({ email: expiredEmail, code: expiredCode }, 400));
  // Logout revokes even a copied cookie.
  const copied = new Client(); copied.cookies = new Map(user.cookies);
  await user.request('/auth/logout', { method: 'POST' });
  await copied.request('/submissions', { status: 401 });
  const copiedAdmin = new Client(); copiedAdmin.cookies = new Map(admin.cookies);
  await admin.request('/admin/logout', { method: 'POST' });
  await copiedAdmin.request('/admin/submissions', { status: 401 });
  console.log('PASS: SMTP codes, cooldown, expiry, attempt limit, single use, automatic registration, session revocation, role isolation, CSRF, ownership, duplicate submissions, pagination, concurrent review, approval publication, rejection history, likes and cancellation');
} finally { await redis.quit(); }
