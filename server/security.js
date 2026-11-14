import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHmac, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const digestCode = (secret, email, code) => createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [method, salt, hash] = stored.split('$');
  if (method !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const actual = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const codeScript = `
local expected = redis.call('HGET', KEYS[1], 'digest')
if not expected then return 0 end
if expected == ARGV[1] then redis.call('DEL', KEYS[1]); return 1 end
local attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
if attempts >= 5 then redis.call('DEL', KEYS[1]) end
return 0
`;
export const rateScript = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return {current, redis.call('TTL', KEYS[1])}
`;
