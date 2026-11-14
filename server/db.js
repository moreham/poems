import mysql from 'mysql2/promise';
import { readFile, access, copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config } from './config.js';
import { hashPassword, sha256 } from './security.js';
export const db = mysql.createPool({
  host: config.MYSQL_HOST, port: config.MYSQL_PORT, user: config.MYSQL_USER,
  password: config.MYSQL_PASSWORD, database: config.MYSQL_DATABASE,
  charset: 'utf8mb4', timezone: 'Z', connectionLimit: 10, dateStrings: true
});
export async function transaction(callback) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
export async function initializeDatabase() {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  for (const statement of schema.split(';').filter(value => value.trim())) await db.query(statement);
  const poems = JSON.parse(await readFile(new URL('./data/poems.json', import.meta.url), 'utf8'));
  await transaction(async connection => {
    for (const poem of poems) {
      await connection.execute(`INSERT IGNORE INTO poems
        (verse, verse_key, title, author, meaning, original, source_url, excerpt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [poem.verse, sha256(poem.verse), poem.title, poem.author, poem.meaning, poem.original, poem.url || '', !!poem.excerpt]);
    }
  });
  const [admins] = await db.query('SELECT id FROM admins LIMIT 1');
  if (!admins.length) {
    if (!config.ADMIN_PASSWORD) throw new Error('首次启动请设置 ADMIN_PASSWORD（至少 12 位）');
    await db.execute('INSERT INTO admins (username, password_hash) VALUES (?, ?)',
      [config.ADMIN_USERNAME, await hashPassword(config.ADMIN_PASSWORD)]);
  }
  if (config.LEGACY_SQLITE_PATH) {
    try { await access(config.LEGACY_SQLITE_PATH); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    const [done] = await db.execute('SELECT name FROM migrations WHERE name = ?', ['legacy-likes-v1']);
    if (done.length) return;
    const { DatabaseSync } = await import('node:sqlite');
    // The stopped legacy database may retain WAL mode. Work on a private copy
    // so SQLite can rebuild its shared-memory file without touching the source.
    const snapshotDirectory = await mkdtemp(join(tmpdir(), 'poems-legacy-'));
    let legacy;
    try {
      const snapshot = join(snapshotDirectory, 'likes.sqlite3');
      await copyFile(config.LEGACY_SQLITE_PATH, snapshot);
      try { await copyFile(`${config.LEGACY_SQLITE_PATH}-wal`, `${snapshot}-wal`); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      legacy = new DatabaseSync(snapshot);
      const columns = legacy.prepare('PRAGMA table_info(likes)').all();
      if (!columns.length) return;
      const hasDraw = columns.some(column => column.name === 'draw_id');
      const rows = legacy.prepare(`SELECT poem, visitor, ${hasDraw ? 'draw_id' : "'' AS draw_id"} FROM likes`).all();
      await transaction(async connection => {
        for (const row of rows) {
          const [poem] = await connection.execute('SELECT id FROM poems WHERE verse_key = ?', [sha256(row.poem)]);
          if (!poem.length) throw new Error('旧点赞记录中的诗句未找到，迁移已回滚');
          await connection.execute('INSERT IGNORE INTO likes (poem_id, visitor, draw_id) VALUES (?, ?, ?)',
            [poem[0].id, row.visitor, row.draw_id]);
        }
        await connection.execute('INSERT INTO migrations (name) VALUES (?)', ['legacy-likes-v1']);
      });
      console.log(`已迁移 ${rows.length} 条旧点赞记录`);
    } finally { legacy?.close(); await rm(snapshotDirectory, { recursive: true, force: true }); }
  }
}
