import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { z } from 'zod';
import { config } from './config.js';
import { db, transaction } from './db.js';
import { HttpError, sha256, hashPassword, verifyPassword } from './security.js';
import { redis, limit, ipKey, requireRole, getSession, createSession, destroySession, sendCode, consumeCode } from './auth.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.TRUST_PROXY_HOPS);
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:'], fontSrc: ["'self'", 'data:'], connectSrc: ["'self'"],
  upgradeInsecureRequests: config.APP_ORIGIN.startsWith('https:') ? [] : null
} }, strictTransportSecurity: config.APP_ORIGIN.startsWith('https:') ? undefined : false }));
app.use(cookieParser());
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (req.get('Origin') !== config.APP_ORIGIN || req.get('Sec-Fetch-Site') === 'cross-site')) {
    throw new HttpError(403, '请从本站发起请求');
  }
  next();
});
app.use(express.json({ limit: '32kb' }));
app.get('/api/health', async (req, res) => {
  await db.query('SELECT 1'); await redis.ping(); res.json({ status: 'ok' });
});
app.use('/api', async (req, res, next) => { await limit(`api:${ipKey(req)}`, 180, 60); next(); });
const parse = (schema, value) => {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, result.error.issues[0].message);
  return result.data;
};
const emailSchema = z.string().trim().toLowerCase().email('请输入有效邮箱').max(254).regex(/^[\x21-\x7e]+$/, '请输入有效邮箱');
const loginSchema = z.object({ email: emailSchema, code: z.string().regex(/^\d{6}$/, '请输入 6 位验证码') });
const sourceSchema = z.union([z.literal(''), z.string().url().max(1000).refine(url => ['https:', 'http:'].includes(new URL(url).protocol), '来源链接必须使用 http 或 https')]);
const submissionSchema = z.object({
  request_id: z.string().uuid('无效的投稿标识'),
  verse: z.string().trim().min(2, '诗句至少 2 个字').max(60, '诗句最多 60 个字'),
  title: z.string().trim().min(1, '请填写作品名称').max(120),
  author: z.string().trim().min(1, '请填写作者').max(80),
  meaning: z.string().trim().min(1, '请填写诗意解读').max(2000),
  original: z.string().trim().max(5000).default(''),
  source_url: sourceSchema.default('')
});
const pageSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(10), status: z.enum(['all', 'pending', 'approved', 'rejected']).default('all') });
const idSchema = z.coerce.number().int().positive().max(4294967295);

app.post('/api/auth/code', async (req, res) => {
  const { email } = parse(z.object({ email: emailSchema }), req.body);
  await sendCode(req, email); res.json({ message: '验证码已发送，请查收邮箱', retryAfter: 60 });
});
app.post('/api/auth/login', async (req, res) => {
  const { email, code } = parse(loginSchema, req.body);
  await consumeCode(req, email, code);
  await db.execute('INSERT INTO users (email) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)', [email]);
  const [[user]] = await db.execute('SELECT id, email FROM users WHERE email = ?', [email]);
  await createSession(req, res, 'user', user.id); res.json({ user });
});
app.get('/api/auth/me', async (req, res) => {
  const session = await getSession(req, 'user');
  const [rows] = session ? await db.execute('SELECT id, email FROM users WHERE id = ?', [session.id]) : [[]];
  res.json({ user: rows[0] || null });
});
app.post('/api/auth/logout', async (req, res) => { await destroySession(req, res, 'user'); res.json({ ok: true }); });
app.get('/api/poems', async (req, res) => {
  const [poems] = await db.query('SELECT id, verse, title, author, meaning, original, source_url, excerpt FROM poems ORDER BY id');
  res.json({ poems });
});
app.post('/api/submissions', requireRole('user'), async (req, res) => {
  await limit(`submit:${req.auth.id}`, 10, 3600);
  const data = parse(submissionSchema, req.body);
  const result = await transaction(async connection => {
    // Serialize a user's submissions, including double clicks with different request ids.
    await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [req.auth.id]);
    const [existing] = await connection.execute('SELECT id, status FROM submissions WHERE user_id = ? AND request_id = ?', [req.auth.id, data.request_id]);
    if (existing.length) return existing[0];
    const key = sha256(data.verse);
    const [published] = await connection.execute('SELECT id FROM poems WHERE verse_key = ?', [key]);
    const [pending] = await connection.execute("SELECT id FROM submissions WHERE user_id = ? AND verse_key = ? AND status = 'pending'", [req.auth.id, key]);
    if (published.length || pending.length) throw new HttpError(409, '这句诗已收录或正在等待审核');
    const [created] = await connection.execute(`INSERT INTO submissions
      (user_id, request_id, verse, verse_key, title, author, meaning, original, source_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.auth.id, data.request_id, data.verse, key, data.title, data.author, data.meaning, data.original || data.verse, data.source_url]);
    return { id: created.insertId, status: 'pending' };
  });
  res.status(201).json(result);
});
app.get('/api/submissions', requireRole('user'), async (req, res) => {
  const { page, pageSize, status } = parse(pageSchema, req.query);
  const where = `user_id = ?${status === 'all' ? '' : ' AND status = ?'}`;
  const values = status === 'all' ? [req.auth.id] : [req.auth.id, status];
  const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM submissions WHERE ${where}`, values);
  const [items] = await db.query(`SELECT id, verse, title, author, meaning, original, source_url, status,
    rejection_reason, reviewed_at, created_at FROM submissions WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
  [...values, pageSize, (page - 1) * pageSize]);
  res.json({ items, total, page, pageSize });
});

const dummyAdminKey = await hashPassword(randomBytes(32).toString('hex'));
app.post('/api/admin/login', async (req, res) => {
  await limit(`admin-ip:${ipKey(req)}`, 10, 900);
  const data = parse(z.object({ key: z.string().min(1, '请输入管理员密钥').max(128) }).strict(), req.body);
  await limit(`admin-name:${sha256(config.ADMIN_USERNAME.toLowerCase())}`, 10, 900);
  const [[admin]] = await db.execute('SELECT id, username, password_hash FROM admins WHERE username = ?', [config.ADMIN_USERNAME]);
  const valid = await verifyPassword(data.key, admin?.password_hash || dummyAdminKey);
  if (!admin || !valid) throw new HttpError(401, '管理员密钥错误');
  await createSession(req, res, 'admin', admin.id); res.json({ admin: { id: admin.id, username: admin.username } });
});
app.get('/api/admin/me', async (req, res) => {
  const session = await getSession(req, 'admin');
  const [rows] = session ? await db.execute('SELECT id, username FROM admins WHERE id = ?', [session.id]) : [[]];
  res.json({ admin: rows[0] || null });
});
app.post('/api/admin/logout', async (req, res) => { await destroySession(req, res, 'admin'); res.json({ ok: true }); });
app.get('/api/admin/submissions', requireRole('admin'), async (req, res) => {
  const { page, pageSize, status } = parse(pageSchema, req.query);
  const where = status === 'all' ? '' : 'WHERE s.status = ?';
  const params = status === 'all' ? [] : [status];
  const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM submissions s ${where}`, params);
  const [items] = await db.query(`SELECT s.*, u.email, a.username AS reviewer FROM submissions s
    JOIN users u ON u.id = s.user_id LEFT JOIN admins a ON a.id = s.reviewed_by
    ${where} ORDER BY s.id DESC LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
  const [counts] = await db.query('SELECT status, COUNT(*) AS count FROM submissions GROUP BY status');
  res.json({ items, total, page, pageSize, counts: Object.fromEntries(counts.map(item => [item.status, item.count])) });
});
app.post('/api/admin/submissions/:id/review', requireRole('admin'), async (req, res) => {
  const id = parse(idSchema, req.params.id);
  const { status, reason } = parse(z.object({ status: z.enum(['approved', 'rejected']), reason: z.string().trim().max(1000).default('') }), req.body);
  await transaction(async connection => {
    const [[item]] = await connection.execute('SELECT * FROM submissions WHERE id = ? FOR UPDATE', [id]);
    if (!item) throw new HttpError(404, '投稿不存在');
    if (item.status !== 'pending') throw new HttpError(409, '该投稿已审核，请刷新列表');
    if (status === 'approved') {
      try {
        await connection.execute(`INSERT INTO poems (verse, verse_key, title, author, meaning, original, source_url, submission_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [item.verse, item.verse_key, item.title, item.author, item.meaning, item.original, item.source_url, id]);
      } catch (error) { if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, '该诗句已收录，请驳回重复投稿'); throw error; }
    }
    await connection.execute('UPDATE submissions SET status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?',
      [status, status === 'rejected' ? reason : null, req.auth.id, id]);
  });
  res.json({ id, status });
});

const drawSchema = z.string().regex(/^[a-f0-9]{32}$/, '无效的抽签标识');
async function likes(req, res, write) {
  const data = parse(z.object({ poem: z.string().min(1).max(240), draw_id: drawSchema, liked: z.boolean().default(true) }), write ? req.body : req.query);
  const [[poem]] = await db.execute('SELECT id FROM poems WHERE verse_key = ?', [sha256(data.poem)]);
  if (!poem) throw new HttpError(400, '无效的诗签');
  let visitor = req.cookies.poem_visitor;
  if (typeof visitor !== 'string' || !/^[a-f0-9]{32}$/.test(visitor)) {
    visitor = randomBytes(16).toString('hex');
    res.cookie('poem_visitor', visitor, { httpOnly: true, sameSite: 'lax', secure: config.APP_ORIGIN.startsWith('https:'), maxAge: 365 * 86400000 });
    if (write) throw new HttpError(409, '请启用 Cookie 并刷新后再点赞');
  }
  if (write) await limit(`like:${visitor}`, 60, 60);
  const result = await transaction(async connection => {
    if (write) {
      // Lock the poem to serialize its counters and avoid concurrent toggle races.
      await connection.execute('SELECT id FROM poems WHERE id = ? FOR UPDATE', [poem.id]);
      if (data.liked) await connection.execute('INSERT IGNORE INTO likes (poem_id, visitor, draw_id) VALUES (?, ?, ?)', [poem.id, visitor, data.draw_id]);
      else await connection.execute('DELETE FROM likes WHERE poem_id = ? AND visitor = ? AND draw_id = ?', [poem.id, visitor, data.draw_id]);
    }
    const [[{ count }]] = await connection.execute('SELECT COUNT(*) AS count FROM likes WHERE poem_id = ?', [poem.id]);
    const [existing] = await connection.execute('SELECT 1 FROM likes WHERE poem_id = ? AND visitor = ? AND draw_id = ?', [poem.id, visitor, data.draw_id]);
    return { count, liked: existing.length > 0 };
  });
  res.json(result);
}
app.get('/api/likes', (req, res) => likes(req, res, false));
app.post('/api/likes', (req, res) => likes(req, res, true));
app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }));
app.use(express.static(resolve('dist'), { index: false }));
app.get(['/', '/submissions', '/admin'], (req, res) => res.sendFile(resolve('dist/index.html')));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || (error.type === 'entity.too.large' ? 413 : 500);
  if (error.retryAfter) res.set('Retry-After', String(error.retryAfter));
  if (status >= 500) console.error('请求处理失败', error.code || error.name);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: '请求格式错误' });
  res.status(status).json({ error: status >= 500 && !(error instanceof HttpError) ? '服务暂时不可用，请稍后重试' : error.message });
});
