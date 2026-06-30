CREATE TABLE IF NOT EXISTS flashtalking_credentials (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  api_token  TEXT NOT NULL,
  library_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
