CREATE TABLE IF NOT EXISTS brands (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  primary_color   TEXT NOT NULL DEFAULT '',
  secondary_color TEXT NOT NULL DEFAULT '',
  accent_color    TEXT NOT NULL DEFAULT '',
  text_color      TEXT NOT NULL DEFAULT '',
  font_family     TEXT NOT NULL DEFAULT '',
  tone            TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Carry over whatever was saved in the old single-row brand_guide (009) as a first entry.
INSERT INTO brands (id, name, primary_color, secondary_color, accent_color, text_color, font_family, tone, notes)
SELECT lower(hex(randomblob(16))), 'My Brand', primary_color, secondary_color, accent_color, text_color, font_family, tone, notes
FROM brand_guide
WHERE id = 'default'
  AND (primary_color != '' OR secondary_color != '' OR accent_color != '' OR text_color != '' OR font_family != '' OR tone != '' OR notes != '');
