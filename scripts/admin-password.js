import { db } from '../server/db.js';
import { config } from '../server/config.js';
import { hashPassword } from '../server/security.js';
import { redis } from '../server/auth.js';
if (!config.ADMIN_PASSWORD) throw new Error('请通过 ADMIN_PASSWORD 环境变量提供新密码');
try {
  const [result] = await db.execute('UPDATE admins SET password_hash = ? WHERE username = ?',
    [await hashPassword(config.ADMIN_PASSWORD), config.ADMIN_USERNAME]);
  if (!result.affectedRows) throw new Error('管理员不存在');
  await redis.connect();
  for await (const keys of redis.scanIterator({ MATCH: 'session:admin:*', COUNT: 100 })) {
    if (keys.length) await redis.del(keys);
  }
  console.log('管理员密码已更新，现有管理员会话已退出');
} finally { await db.end(); if (redis.isOpen) await redis.quit(); }
