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

-- Admin-created reusable templates (one row per template family)
CREATE TABLE IF NOT EXISTS templates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'custom',
  created_by  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- One row per size variant of a template (e.g. 300x250, 300x600, 320x480)
CREATE TABLE IF NOT EXISTS template_sizes (
  id           TEXT PRIMARY KEY,
  template_id  TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  width        INTEGER NOT NULL,
  height       INTEGER NOT NULL,
  data         TEXT NOT NULL DEFAULT '{"elements":[]}',  -- JSON: { elements: [...] }
  custom_html  TEXT NOT NULL DEFAULT '',   -- raw HTML replacing the element-based container, for bespoke sizes
  custom_js    TEXT NOT NULL DEFAULT '',   -- raw JS injected into exported banners built from this size
  custom_css   TEXT NOT NULL DEFAULT '',   -- raw CSS injected into exported banners built from this size
  custom_manifest TEXT NOT NULL DEFAULT '', -- raw JSON object merged into manifest.js's FT.manifest({...})
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Single-row brand guide (id is always 'default') referenced by AI banner design so
-- generations stay on-brand — colors, font, and a free-text tone/voice description.
CREATE TABLE IF NOT EXISTS brand_guide (
  id             TEXT PRIMARY KEY DEFAULT 'default',
  primary_color  TEXT NOT NULL DEFAULT '',
  secondary_color TEXT NOT NULL DEFAULT '',
  accent_color   TEXT NOT NULL DEFAULT '',
  text_color     TEXT NOT NULL DEFAULT '',
  font_family    TEXT NOT NULL DEFAULT '',
  tone           TEXT NOT NULL DEFAULT '',   -- free-text voice/tone description for AI copy
  notes          TEXT NOT NULL DEFAULT '',   -- any other brand notes (do/don't, taglines, etc.)
  updated_at     INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_banners_user_id ON banners(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_template_sizes_template_id ON template_sizes(template_id);
