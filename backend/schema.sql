PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  password TEXT, salt TEXT, role TEXT NOT NULL DEFAULT 'student', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL,
  title TEXT NOT NULL, category TEXT NOT NULL, place TEXT NOT NULL, happened_on TEXT NOT NULL,
  description TEXT NOT NULL, question TEXT NOT NULL DEFAULT '', private_note TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '', visual TEXT NOT NULL DEFAULT 'bag',
  status TEXT NOT NULL DEFAULT 'open', moderation TEXT NOT NULL DEFAULT 'pending',
  active_claim_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id),
  applicant_id TEXT NOT NULL REFERENCES users(id), evidence TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', review_note TEXT NOT NULL DEFAULT '',
  owner_confirmed INTEGER NOT NULL DEFAULT 0, applicant_confirmed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS active_applicant ON claims(item_id, applicant_id) WHERE status IN ('pending','approved');
CREATE INDEX IF NOT EXISTS items_public ON items(moderation, status, created_at);
CREATE INDEX IF NOT EXISTS claims_item ON claims(item_id);
CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), item_id TEXT,
  title TEXT NOT NULL, body TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notices_user ON notices(user_id, created_at);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id), actor_id TEXT NOT NULL,
  action TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
