import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
export function openDatabase(filename = new URL('./data/findback.db', import.meta.url)) {
  if (filename instanceof URL) fs.mkdirSync(new URL('.', filename), { recursive: true });
  const sqlite = new DatabaseSync(filename);
  sqlite.exec(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  sqlite.exec('PRAGMA journal_mode=WAL;');
  function prepare(sql) {
    let values = [];
    return {
      sql, get values() { return values; },
      bind(...args) { values = args; return this; },
      async first() { return sqlite.prepare(sql).get(...values) || null; },
      async all() { return { results: sqlite.prepare(sql).all(...values) }; },
      async run() { const r = sqlite.prepare(sql).run(...values); return { meta: { changes: Number(r.changes) } }; }
    };
  }
  return {
    prepare,
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try { const results = statements.map(s => ({ meta: { changes: Number(sqlite.prepare(s.sql).run(...s.values).changes) } })); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    close() { sqlite.close(); }
  };
}
