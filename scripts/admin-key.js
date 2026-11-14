import { db } from '../server/db.js';
import { config } from '../server/config.js';
import { hashPassword } from '../server/security.js';
import { redis } from '../server/auth.js';
if (!config.ADMIN_KEY) throw new Error('请通过 ADMIN_KEY 环境变量提供新密钥');
try {
  const [result] = await db.execute('UPDATE admins SET password_hash = ? WHERE username = ?',
    [await hashPassword(config.ADMIN_KEY), config.ADMIN_USERNAME]);
  if (!result.affectedRows) throw new Error('管理员不存在');
  await redis.connect();
  for await (const keys of redis.scanIterator({ MATCH: 'session:admin:*', COUNT: 100 })) {
    if (keys.length) await redis.del(keys);
  }
  console.log('管理员密钥已更新，现有管理员会话已退出');
} finally { await db.end(); if (redis.isOpen) await redis.quit(); }
