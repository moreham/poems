import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { db, initializeDatabase } from '../server/db.js';
import { config } from '../server/config.js';
assert.equal(config.NODE_ENV, 'test');
assert.equal(config.MYSQL_DATABASE, 'poems_test');
assert.equal(config.LEGACY_SQLITE_PATH, '/tmp/likes-fixture.sqlite3');
const legacy = new DatabaseSync(config.LEGACY_SQLITE_PATH);
legacy.exec('PRAGMA journal_mode=WAL');
legacy.exec('CREATE TABLE likes (poem TEXT NOT NULL, visitor TEXT NOT NULL, draw_id TEXT NOT NULL DEFAULT \'\', PRIMARY KEY(poem,visitor,draw_id))');
try {
  const [[poem]] = await db.query('SELECT id, verse FROM poems ORDER BY id LIMIT 1');
  const visitor = randomBytes(16).toString('hex');
  legacy.prepare('INSERT INTO likes VALUES (?,?,?)').run(poem.verse, visitor, '');
  legacy.prepare('INSERT INTO likes VALUES (?,?,?)').run(poem.verse, visitor, 'c'.repeat(32));
  await db.query("DELETE FROM migrations WHERE name = 'legacy-likes-v1'");
  await initializeDatabase();
  let [[result]] = await db.execute('SELECT COUNT(*) AS total FROM likes WHERE visitor = ?', [visitor]);
  assert.equal(result.total, 2);
  await initializeDatabase();
  [[result]] = await db.execute('SELECT COUNT(*) AS total FROM likes WHERE visitor = ?', [visitor]);
  assert.equal(result.total, 2);
  console.log('PASS: SQLite legacy and per-draw likes migrate atomically; repeated initialization preserves counts');
} finally { legacy.close(); await db.end(); }
