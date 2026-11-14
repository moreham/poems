import { randomBytes, randomInt } from 'node:crypto';
import { createClient } from 'redis';
import nodemailer from 'nodemailer';
import { config } from './config.js';
import { HttpError, sha256, digestCode, rateScript, codeScript } from './security.js';
export const redis = createClient({ url: config.REDIS_URL });
redis.on('error', () => console.error('Redis 连接异常'));
const transport = nodemailer.createTransport({
  host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE,
  requireTLS: config.SMTP_REQUIRE_TLS,
  auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
  connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
});
const cookieName = role => role === 'admin' ? 'poems_admin' : 'poems_user';
const cookieOptions = role => ({ httpOnly: true, sameSite: 'lax', secure: config.APP_ORIGIN.startsWith('https:'), path: role === 'admin' ? '/api/admin' : '/' });
export async function limit(key, max, seconds) {
  const [count, ttl] = await redis.eval(rateScript, { keys: [`rate:${key}`], arguments: [String(seconds)] });
  if (count > max) {
    const error = new HttpError(429, '操作过于频繁，请稍后再试');
    error.retryAfter = Math.max(1, ttl);
    throw error;
  }
}
export const ipKey = req => sha256(req.ip || 'unknown');
export async function createSession(req, res, role, id) {
  await destroySession(req, res, role);
  const token = randomBytes(32).toString('hex');
  const ttl = role === 'admin' ? 8 * 3600 : 7 * 86400;
  await redis.set(`session:${role}:${sha256(token)}`, JSON.stringify({ id, role }), { EX: ttl });
  res.cookie(cookieName(role), token, { ...cookieOptions(role), maxAge: ttl * 1000 });
}
export async function destroySession(req, res, role) {
  const token = req.cookies[cookieName(role)];
  if (typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)) await redis.del(`session:${role}:${sha256(token)}`);
  res.clearCookie(cookieName(role), cookieOptions(role));
}
export async function getSession(req, role) {
  const token = req.cookies[cookieName(role)];
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const stored = await redis.get(`session:${role}:${sha256(token)}`);
  if (!stored) return null;
  const session = JSON.parse(stored);
  return session.role === role ? session : null;
}
export const requireRole = role => async (req, res, next) => {
  const session = await getSession(req, role);
  if (!session) throw new HttpError(401, role === 'admin' ? '请先验证管理员密钥' : '请先登录后再操作');
  req.auth = session;
  next();
};
export async function sendCode(req, email) {
  const key = sha256(email);
  await limit(`code-ip:${ipKey(req)}`, 20, 3600);
  await limit(`code-email:${key}`, 5, 3600);
  const locked = await redis.set(`code-cooldown:${key}`, '1', { NX: true, EX: 60 });
  if (!locked) {
    const error = new HttpError(429, '验证码已发送，请 60 秒后再试');
    error.retryAfter = Math.max(1, await redis.ttl(`code-cooldown:${key}`));
    throw error;
  }
  const code = String(randomInt(100000, 1000000));
  await redis.multi().hSet(`code:${key}`, { digest: digestCode(config.AUTH_SECRET, email, code), attempts: '0' })
    .expire(`code:${key}`, 600).exec();
  try {
    await transport.sendMail({ from: config.SMTP_FROM, to: email, subject: '一笺诗意 · 登录验证码',
      text: `你的登录验证码是：${code}\n\n验证码 10 分钟内有效，仅可使用一次。请勿向他人透露。\n如果不是你本人操作，请忽略本邮件。` });
  } catch {
    await redis.del([`code:${key}`, `code-cooldown:${key}`]);
    throw new HttpError(503, '邮件暂时发送失败，请稍后重试');
  }
}
export async function consumeCode(req, email, code) {
  await limit(`verify-ip:${ipKey(req)}`, 30, 900);
  const result = await redis.eval(codeScript, { keys: [`code:${sha256(email)}`], arguments: [digestCode(config.AUTH_SECRET, email, code)] });
  if (result !== 1) throw new HttpError(400, '验证码错误或已过期，请重新获取');
}
