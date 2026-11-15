// SQLite store for website enquiries (node:sqlite, built into Node 24). One table, two kinds.
// No IP addresses or user agents are stored.
import { DatabaseSync } from 'node:sqlite';

export function openStore(path) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000; PRAGMA secure_delete=ON;
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('demo','waitlist')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      name TEXT NOT NULL, email TEXT NOT NULL, company TEXT NOT NULL, industry TEXT NOT NULL,
      size TEXT NOT NULL DEFAULT '', challenge TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '', page TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS enquiries_kind_created ON enquiries (kind, created_at);`);
  // Notification status (added later; older databases gain the columns here).
  const cols = db.prepare('PRAGMA table_info(enquiries)').all().map((c) => c.name);
  if (!cols.includes('notified_at')) db.exec('ALTER TABLE enquiries ADD COLUMN notified_at TEXT');
  if (!cols.includes('notify_error')) db.exec('ALTER TABLE enquiries ADD COLUMN notify_error TEXT');
  if (!cols.includes('notify_attempts')) db.exec('ALTER TABLE enquiries ADD COLUMN notify_attempts INTEGER NOT NULL DEFAULT 0');
  const ins = db.prepare('INSERT INTO enquiries (kind,name,email,company,industry,size,challenge,message,page) VALUES (?,?,?,?,?,?,?,?,?)');
  return {
    insert(kind, v) {
      return Number(ins.run(kind, v.name, v.email, v.company, v.industry, v.size || '', v.challenge || '', v.message || '', v.page || '').lastInsertRowid);
    },
    list(kind, since = '0000') {
      return db.prepare('SELECT * FROM enquiries WHERE kind = ? AND created_at >= ? ORDER BY id').all(kind, since);
    },
    // secure_delete overwrites removed rows; the checkpoint moves the change out of the WAL, so the deleted
    // text no longer exists anywhere in the database files (verified by test).
    purge(days) {
      const n = Number(db.prepare("DELETE FROM enquiries WHERE created_at < strftime('%Y-%m-%dT%H:%M:%SZ','now', ?)").run(`-${days} days`).changes);
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      return n;
    },
    get: (id) => db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id),
    markNotified(id) {
      db.prepare("UPDATE enquiries SET notified_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'), notify_error = NULL, notify_attempts = notify_attempts + 1 WHERE id = ?").run(id);
    },
    markNotifyFailed(id, error) {
      db.prepare('UPDATE enquiries SET notify_error = ?, notify_attempts = notify_attempts + 1 WHERE id = ?').run(String(error).slice(0, 300), id);
    },
    /** Enquiries whose email has not been delivered (failed, or never tried because notifications were off). */
    unnotified() {
      return db.prepare('SELECT id, kind, created_at, notify_attempts, notify_error FROM enquiries WHERE notified_at IS NULL ORDER BY id').all();
    },
    stats() {
      return db.prepare("SELECT kind, COUNT(*) AS count, MIN(created_at) AS oldest, MAX(created_at) AS newest, SUM(notified_at IS NULL) AS not_emailed FROM enquiries GROUP BY kind ORDER BY kind").all();
    },
    close: () => db.close(),
  };
}
