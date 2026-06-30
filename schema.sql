-- Users
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,        -- UUID generated server-side
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,           -- bcrypt / argon2 hash
  role          TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user'
  disabled      INTEGER NOT NULL DEFAULT 0,   -- 0 = active, 1 = disabled
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Banners
CREATE TABLE IF NOT EXISTS banners (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  data        TEXT NOT NULL,             -- full banner JSON (elements, canvas size, etc.)
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Sessions (simple token-based auth)
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Flashtalking credentials (one per user)
CREATE TABLE IF NOT EXISTS flashtalking_credentials (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ft_email           TEXT NOT NULL,
  ft_password        TEXT NOT NULL,
  library_id         TEXT NOT NULL DEFAULT '',
  library_name       TEXT NOT NULL DEFAULT '',
  library_advertiser TEXT NOT NULL DEFAULT '',
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_banners_user_id ON banners(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
