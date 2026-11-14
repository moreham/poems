import { config } from './config.js';
import { initializeDatabase, db } from './db.js';
import { redis } from './auth.js';
import { app } from './app.js';
await redis.connect();
await initializeDatabase();
const server = app.listen(config.PORT, '0.0.0.0', () => console.log(`诗词服务已启动，端口 ${config.PORT}`));
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  server.close(async () => { await db.end(); await redis.quit(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
