import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { db } from '../server/db.js';
import { config } from '../server/config.js';
assert.equal(config.NODE_ENV, 'production');
const directory = await mkdtemp(join(tmpdir(), 'poems-audit-'));
const snapshot = join(directory, 'likes.sqlite3');
await copyFile(config.LEGACY_SQLITE_PATH, snapshot);
try { await copyFile(`${config.LEGACY_SQLITE_PATH}-wal`, `${snapshot}-wal`); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const legacy = new DatabaseSync(snapshot);
try {
  const old = legacy.prepare('SELECT poem, visitor, draw_id FROM likes').all();
  const [rows] = await db.query('SELECT p.verse AS poem, l.visitor, l.draw_id FROM likes l JOIN poems p ON p.id = l.poem_id');
  const keys = rows.map(row => JSON.stringify([row.poem, row.visitor, row.draw_id]));
  for (const row of old) assert(keys.includes(JSON.stringify([row.poem, row.visitor, row.draw_id])), '旧点赞记录未完整迁移');
  const [[counts]] = await db.query('SELECT (SELECT COUNT(*) FROM poems) AS poems, (SELECT COUNT(*) FROM submissions) AS submissions, (SELECT COUNT(*) FROM users) AS users');
  const [[migration]] = await db.query("SELECT COUNT(*) AS count FROM migrations WHERE name = 'legacy-likes-v1'");
  assert.equal(migration.count, 1);
  const [[admin]] = await db.query('SELECT password_hash FROM admins LIMIT 1');
  assert(admin.password_hash.startsWith('scrypt$'));
  console.log(JSON.stringify({ legacyLikes: old.length, mysqlLikes: rows.length, ...counts, migration: 'verified', adminPassword: 'scrypt hash only' }));
} finally { legacy.close(); await db.end(); await rm(directory, { recursive: true, force: true }); }
