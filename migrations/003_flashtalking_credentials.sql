CREATE TABLE IF NOT EXISTS flashtalking_credentials (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  api_token          TEXT NOT NULL,
  library_id         TEXT NOT NULL,
  library_name       TEXT NOT NULL DEFAULT '',
  library_advertiser TEXT NOT NULL DEFAULT '',
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch())
);
