CREATE TABLE IF NOT EXISTS brand_guide (
  id             TEXT PRIMARY KEY DEFAULT 'default',
  primary_color  TEXT NOT NULL DEFAULT '',
  secondary_color TEXT NOT NULL DEFAULT '',
  accent_color   TEXT NOT NULL DEFAULT '',
  text_color     TEXT NOT NULL DEFAULT '',
  font_family    TEXT NOT NULL DEFAULT '',
  tone           TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT '',
  updated_at     INTEGER NOT NULL DEFAULT (unixepoch())
);
